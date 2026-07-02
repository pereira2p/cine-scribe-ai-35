# CineVault Portable — Refatoração Arquitetural

Transformar o CineVault em um **Media Center local**, inspirado no Plex/Jellyfin/Kodi, preservando 100% do design system, componentes visuais, tema escuro, animações, sidebar, MovieCards e responsividade. Apenas a **arquitetura interna** muda.

## Filosofia

- Sem upload. Sem streaming remoto. Sem R2/Drive/Storage.
- Usuário aponta uma pasta local → app escaneia, identifica, enriquece via TMDB, organiza.
- Banco local (IndexedDB no navegador; SQLite quando empacotado Electron/Tauri).
- Supabase Auth some do fluxo obrigatório — app abre direto na biblioteca.

## Fases

### Fase 1 — Fundação local (esta entrega)

1. **Remover camada de streaming/upload**
   - Apagar: `src/lib/uploads.functions.ts`, `src/components/UploadDropzone.tsx`, `src/lib/providers/r2.server.ts`, `src/lib/providers/storage.ts`, `src/lib/providers/import.ts`, `src/lib/imports.functions.ts`, `src/components/UniversalImportDialog.tsx`, `src/components/AddMovieDialog.tsx`, `src/components/ImportProgressStepper.tsx`, `src/routes/_authenticated/uploads.tsx`, `src/routes/_authenticated/downloads.tsx`, `src/routes/_authenticated/watch-party.tsx`.
   - Remover secrets R2/AWS do backend.

2. **Novo backbone: acesso local via File System Access API**
   - `src/lib/library/fs.ts` — abre um handle de diretório (`showDirectoryPicker`), persiste em IndexedDB via `idb-keyval`, faz scan recursivo, retorna lista de arquivos de vídeo (mp4/mkv/avi/mov/webm).
   - Fallback para navegadores sem File System Access: `<input webkitdirectory>` (leitura única, sem reescanear).
   - Detecção de plataforma centralizada em `src/lib/platform.ts` (web / electron / capacitor) — Fase 5 pluga os outros backends sem tocar UI.

3. **Banco local com Dexie (IndexedDB)**
   - `src/lib/db/local.ts` — schema Dexie: `movies`, `files`, `favorites`, `progress`, `history`, `collections`, `settings`, `assets_cache`.
   - Hooks React: `useLocalMovies()`, `useProgress(movieId)`, `useFavorites()` substituem as chamadas Supabase atuais.

4. **Nova rota raiz sem auth**
   - Remover `_authenticated` como gate obrigatório: o app abre em `/` direto na biblioteca local.
   - Manter `auth.tsx` acessível como opcional ("Sincronizar entre dispositivos — em breve"), mas fora do fluxo principal.
   - Remover a landing/tela intermediária ("aquela que adicionei o comentário") e renderizar a Library como home.

5. **Scanner e watch loop**
   - Ao abrir o app: reidrata o handle da pasta, executa scan incremental, insere novos arquivos em `files`, dispara enriquecimento TMDB para os que ainda não têm `tmdbId`.
   - Polling manual via botão "Reescanear" na sidebar (watchers reais chegam com Electron na Fase 5).

### Fase 2 — TMDB & metadados (esta entrega, versão mínima)

- Reaproveitar `src/lib/tmdb.server.ts` como cliente HTTP puro (sem Supabase), migrado para `src/lib/tmdb/client.ts` chamado direto do browser via TMDB API v3 com token público (env `VITE_TMDB_TOKEN`).
- `src/lib/library/identify.ts` — parse do filename (título + ano), busca TMDB, retorna candidatos. Se houver mais de um match razoável, mostra modal de escolha.
- Metadados + posters/backdrops salvos em Dexie; imagens cacheadas via `caches.open('tmdb-images')` (Service Worker leve, sem PWA offline completo).

### Fase 3 — Player local

- `MyVaultPlayer` recebe `File` ou `FileSystemFileHandle` → gera `URL.createObjectURL` para reprodução. Zero rede.
- Persistir posição a cada 5s em `progress` (Dexie). "Continue Assistindo" lê dessa tabela.
- Legendas externas (`.srt`/`.vtt` ao lado do arquivo) na Fase 3 completa — deixo o hook pronto mas sem UI de seleção ainda.

### Fase 4 — Copilot local

- Reescrever `copilot.functions.ts` como função pura do browser: constrói contexto a partir do Dexie e chama Lovable AI Gateway direto do cliente (fetch com `VITE_LOVABLE_AI_KEY` público ou proxy leve).
- Prompts adaptados: "sugira do que já tenho", "não assistidos", "por diretor", "nota TMDB > 8".

### Fase 5 — Empacotamento

- Camada `platform.ts` já isola FS/DB. Electron/Tauri implementam `LocalFsAdapter` real (chokidar watch + SQLite via `better-sqlite3`). Capacitor implementa via `@capacitor/filesystem`.
- Não implementado nesta entrega — só a arquitetura preparada.

## O que fica preservado

- Todo o design system (`styles.css`, tokens oklch, gradientes, tipografia).
- Componentes: `MovieCard`, `MovieCarousel`, `MovieHero`, `AppSidebar`, `BottomNav`, `CineVaultCopilot`, `SearchResultCard`, `UniversalSearchBar`, todos os `ui/*`.
- Rotas visuais: dashboard, library, favorites, search, movie detail, settings, collections, discover, history, lists, stats.
- Animações Framer Motion, sidebar responsiva, tema escuro premium.

## O que sai da UI

- Botão "Adicionar Filme" / diálogos de import → substituído por "Escolher pasta da biblioteca" (uma vez) + "Reescanear".
- Rotas `uploads`, `downloads`, `watch-party` → removidas do menu.
- Tela de landing intermediária removida; `/` = biblioteca.

## Escopo desta entrega

Fases 1 e 2 completas + esqueleto funcional das Fases 3/4:
- Escolha de pasta + scan + Dexie ✅
- Identificação TMDB + posters/backdrops ✅
- Player tocando arquivo local ✅
- Progresso salvo localmente ✅
- Copilot lendo biblioteca local ✅
- Sem placeholders falsos: rotas cujo backend some são removidas, não stubadas.

## Riscos

- **File System Access API** só existe em Chromium (Chrome/Edge/Opera/Brave). Firefox/Safari caem no fallback `<input webkitdirectory>` (funciona, mas precisa reselecionar a pasta a cada sessão). Documento isso no onboarding.
- **TMDB token no cliente**: uso o *Read Access Token* público (é feito para isso). Sem secrets server-side.
- **Migração destrutiva**: dados atuais em Supabase (movies importados, favorites) não migram. Aviso o usuário — a base era experimental.

Posso prosseguir com a Fase 1 + 2 completas nesta entrega?
