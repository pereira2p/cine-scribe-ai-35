## Fase 2 — CineVault Premium (Mobile-First + Plugin Architecture)

A Fase 1 + 2.0 (R2 + player básico) já está pronta. Esta fase eleva o app ao padrão Netflix/Apple TV/Plex, mobile-first, com arquitetura plugin-first para tudo que pode crescer.

Vou entregar em **4 sub-fases** dentro deste plano para manter qualidade. Posso executar tudo numa sequência só após sua aprovação.

---

### Sub-fase 2A — Fundação Mobile-First & Navegação

- **Bottom Navigation** (`<BottomNav />`): Home / Buscar / ➕ / Biblioteca / Favoritos. Visível em `< md`. Sidebar (já existe) só em `≥ md`.
- **Layout `_authenticated/route.tsx`** ajustado: detecta viewport, alterna sidebar ↔ bottom nav, safe-area iOS (`env(safe-area-inset-*)`).
- Rota raiz `/` ainda decide: autenticado → `/app`, anônimo → `/auth`.
- Remoção de qualquer resquício de "landing".
- Design tokens revisitados em `src/styles.css`: glass tokens (`--glass-bg`, `--glass-border`), gradient overlays, motion durations, blur layers — tudo via `oklch` semântico, sem cores hardcoded.
- Skeleton components reutilizáveis (`<PosterSkeleton />`, `<RowSkeleton />`).

### Sub-fase 2B — Plugin Architecture (ImportProvider + StorageProvider++)

Novas interfaces em `src/lib/providers/`:

- **`ImportProvider`** (`import.ts`):
  ```ts
  analyze(input) → { kind, candidates[] }
  preview(ref) → { title?, poster?, files[] }
  stream(ref) → StreamSource
  download(ref) → ReadableStream
  import(ref, opts) → { movieId, uploadId? }
  ```
- Implementações:
  - `LocalUploadProvider` (já existe via R2 — refatorado para `ImportProvider`)
  - `R2Provider` (já existe)
  - `UrlProvider` (URL direta `.mp4/.mkv/.webm`)
  - `InternetArchiveProvider` (cola link `archive.org/details/...`, usa API pública `/metadata/{id}`, lista arquivos, escolhe melhor MP4)
  - Stubs prontos com UI "Em breve": Google Drive, OneDrive, Dropbox, NAS, Pasta sincronizada
- **`UniversalImportDialog`** unifica todos os providers numa única UI com tabs.

### Sub-fase 2C — Experiência: Home, Discover, Player, Cast, IA

- **Home revisada**: carrosséis reais com dados — Continuar Assistindo, Recém-Adicionados, Favoritos, Minha Lista, Coleções, Hoje Para Você, Aleatórios. Hero rotativo no topo (top-rated não assistido).
- **Discover** (`/discover`): Filme do Dia, Esquecido (não tocado em 90d), Continuação de Saga (próximo da `collection`), Bem-Avaliado Não Assistido, Aleatório, Por Humor (tags).
- **Player premium** (`MyVaultPlayer` v2):
  - Gestos mobile: double-tap esquerda/direita ±10s, swipe vertical (volume/brilho), pinch zoom
  - PiP, fullscreen, legendas (track VTT), troca de áudio (placeholder), velocidade
  - Botão **Transmitir** (Web `RemotePlayback` + stubs AirPlay/Chromecast)
- **CineVault AI** (`<CopilotFAB />`): botão flutuante global, sheet com chat, server fn `askCopilot` usando **Lovable AI Gateway** (`google/gemini-2.5-flash`, gratuito até 13/out/2025) com contexto da biblioteca do usuário (top 50 + ratings + gêneros).
- **Watch Party**: tela com "Em breve" + arquitetura de sala (tabela `watch_parties` criada mas sem realtime ainda).
- **Download Offline**: UI + service worker stub + tabela `offline_downloads`. Download real adiado.

### Sub-fase 2D — Dados, Jobs, Assets, Tags, Activity, Stats

Migration única adicionando:

- `background_jobs` (id, user_id, type, status, progress, payload jsonb, error, timestamps)
- `movie_assets` (movie_id, kind enum: poster/backdrop/logo/banner/trailer/thumbnail, url, source, is_default)
- `smart_tags` + `movie_smart_tags` (tags como Mind-blowing, Plot Twist, Cult, Slow Burn…)
- `activity_feed` (user_id, kind, payload, created_at)
- `watch_parties` (room_code, host_user_id, movie_id, status)
- `offline_downloads` (user_id, movie_id, quality, status, bytes)
- `viewer_profiles` já existe (Fase 1) — adicionar trigger para registrar no activity feed
- Todas com `GRANT` + RLS por `user_id` + `service_role`

**Stats** (`/stats` reescrita): tempo assistido, contagem, gênero/diretor/ator favoritos (queries reais), heatmap (recharts), streak.

**Activity Feed** componente lateral na Home.

---

### Trade-offs / decisões

```
Internet Archive:  só MP4 direto (simples)    | + HLS/torrent (complexo, fora do MVP)
Copiloto IA:       Gemini 2.5 Flash (grátis)  | GPT-5 (pago, melhor qualidade)
Watch Party:       só UI "em breve"            | realtime já no MVP (+2 dias)
Download offline:  IndexedDB + SW (PWA)        | só UI no MVP
Player gestos:     Hammer.js (8KB)             | handlers custom (mais leve, menos robusto)
Cast:              só Web RemotePlayback API   | + Chromecast SDK (precisa AppID Google)
```

### Fora desta fase

- Transcodificação HLS multi-bitrate
- Capacitor (APK/IPA) — fica para Fase 3 (só prepara PWA + manifest agora)
- Chromecast/AirPlay nativos completos
- Realtime Watch Party funcional
- Download offline real

### Pergunta antes de executar

1. **Posso seguir com Gemini 2.5 Flash** (gratuito via Lovable AI) para o Copiloto? Sem custo adicional, sem secret.
2. **Watch Party / Download offline**: confirma só UI "em breve" no MVP?
3. **Gestos do player**: posso usar handlers custom (sem dependência)?

Se a resposta for "vai com tudo, decide você", executo com: Gemini Flash, UI-only para Watch Party/Download, gestos custom.
