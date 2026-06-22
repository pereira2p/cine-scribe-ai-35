## Fase 2 — Streaming de Vídeo (Cloudflare R2 + Player)

Objetivo: permitir que o usuário envie arquivos de vídeo, armazene no Cloudflare R2 e assista dentro do MyVault com player premium estilo Netflix, mantendo a arquitetura plugin-first criada na Fase 1.

### 1. Cloudflare R2 — Storage Provider

- Implementar `R2StorageProvider` em `src/lib/providers/r2.server.ts` cumprindo a interface `StorageProvider` já definida.
- Operações: `initUpload` (URL pré-assinada PUT, multipart para arquivos grandes), `getStreamSource` (URL assinada com `Range` support), `generateSignedUrl`, `delete`.
- Usar AWS SDK v3 S3 client apontando para endpoint R2 (compatível S3).
- Registrar provider no registry e tornar `r2` o default quando as credenciais existirem.

Secrets necessários (solicitados via add_secret após sua confirmação):
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` (opcional, para CDN custom).

### 2. Upload de arquivos

- Server functions em `src/lib/uploads.functions.ts`:
  - `createUploadIntent({ filename, size, mimeType, movieId? })` → grava linha em `uploads` (status `pending`), retorna URL assinada + `storageKey`.
  - `completeUpload({ uploadId, movieId })` → marca upload como `completed`, atualiza `movies.storage_key`, `storage_provider='r2'`, `file_size`, `mime_type`, `duration` (extraído depois).
  - `abortUpload({ uploadId })` para limpeza.
- Componente `UploadDropzone` (em `src/components/UploadDropzone.tsx`) com:
  - Drag & drop + seleção manual
  - Upload direto do browser para R2 via `fetch(PUT)` com progresso
  - Multipart automático para arquivos > 100 MB
  - Pareamento opcional com um filme existente ou criação a partir do TMDB
- Página `/uploads` reescrita para listar uploads em andamento, falhos e concluídos.

### 3. Player de vídeo

- Componente `<MyVaultPlayer />` em `src/components/player/MyVaultPlayer.tsx` baseado em `video.js` (HLS-ready) ou `<video>` nativo com controles custom — escolha definida pela tabela de trade-offs abaixo.
- Recursos:
  - Play/Pause, seek bar com pré-visualização de tempo, volume, fullscreen, PiP, atalhos de teclado (espaço, ←/→, F, M)
  - Auto-hide de controles, overlay de título e episódio
  - Botão "Continuar de X:XX" quando há histórico
  - Persistência de progresso a cada 5s via `recordPlaybackProgress` server fn (atualiza `watch_history`)
  - Marcação automática como "assistido" em ≥90%
- Rota `_authenticated/watch.$movieId.tsx` em tela cheia, sem sidebar, com fade-out do header.
- Botão "Assistir" na página do filme (`movie.$movieId.tsx`) só aparece quando `storage_key` existe; caso contrário mantém CTA "Enviar arquivo".

### 4. Schema — pequenas extensões

Migration adicionando à tabela `movies` (se ainda não existem) e nova tabela `uploads`:

- `movies`: `storage_key text`, `file_size bigint`, `mime_type text`, `duration_seconds int` (alguns já existem — a migration faz `add column if not exists`).
- `uploads`: `id`, `user_id`, `movie_id` (nullable), `filename`, `size`, `mime_type`, `storage_provider`, `storage_key`, `status` (`pending|uploading|completed|failed|aborted`), `bytes_uploaded`, `error_message`, timestamps. RLS por `user_id` + GRANTs.

### 5. "Continue Assistindo" real

- Atualizar carrossel do dashboard para consumir `watch_history` com `progress_seconds < duration_seconds * 0.9`.
- Ordenar por `last_watched_at desc`, limitar a 12.

### 6. Decisões a confirmar

```text
Player:        video.js (HLS-ready, +120KB) | <video> + controles custom (leve, sem HLS)
Multipart:     5 MB part, paralelismo 4     | 10 MB part, paralelismo 6
Limite upload: 5 GB por arquivo             | sem limite (dependente do plano R2)
```

### Detalhes técnicos

- Todas as chamadas R2 acontecem em arquivos `.server.ts` carregados via `await import(...)` dentro de handlers (regra do template TanStack Start).
- URLs assinadas com TTL curto (15 min para playback, 1 h para upload), regeradas pelo player ao chegar perto da expiração.
- Sem Edge Function: tudo via `createServerFn` autenticado por `requireSupabaseAuth`.
- Sem mudança em telas da Fase 1 além de Dashboard (Continue Assistindo), página do filme (botão Assistir) e `/uploads`.

### Fora desta fase (próximas)

- Transcodificação automática para HLS multi-bitrate
- Legendas (SRT/VTT) e múltiplos áudios
- Copiloto IA (Fase 3)
- Outros providers (Google Drive, OneDrive, NAS)
