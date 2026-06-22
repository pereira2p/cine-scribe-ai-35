Vou construir a Fase 1 do CineVault AI: foundation premium completa, com arquitetura modular preparada para as fases 2-4 (R2/streaming/IA/watch-party) sem retrabalho.

## Stack confirmada

- TanStack Start + React + TS + Tailwind + shadcn + Framer Motion
- Lovable Cloud (Supabase) — auth, DB, RLS
- TMDB API (precisa da sua chave)
- PWA instalável (manifest)
- Arquitetura: camadas `domain/`, `services/`, `repositories/`, `providers/storage/`

## Design System

Tema escuro premium estilo Netflix/Apple TV:

- BG: `oklch(0.13 0.01 270)` near-black com gradient sutil
- Surface: `oklch(0.18 0.012 270)`
- Primary (accent): `oklch(0.62 0.22 25)` vermelho cinematográfico
- Tipografia: Inter (UI) + display tight tracking
- Cards grandes com hover scale + glow, blur effects, skeleton shimmer

## Banco de dados (migration única)

Tabelas com RLS por `user_id`:

- `profiles` (perfis múltiplos por usuário)
- `movies` (metadados TMDB + tmdb_id, hash do arquivo futuro, storage_provider, storage_key)
- `genres`, `movie_genres`
- `people` (atores/diretores), `movie_credits`
- `collections` (franquias TMDB + smart collections), `collection_movies`
- `favorites`, `watchlists`, `watchlist_movies`
- `watch_history` (progresso, last_position, device)
- `user_settings`
- `app_role` enum + `user_roles` + `has_role()` (security definer)
- `invites` (preparado fase 4)

Storage abstrato: coluna `storage_provider` enum (`tmdb_only` | `r2` | `gdrive` | `local`) — fase 1 só `tmdb_only`.

## Edge / Server functions

- `tmdb-search` — busca TMDB
- `tmdb-import` — importa filme completo (detalhes, créditos, coleção)
- `recommendations` — stub que retorna shuffle (substituído por IA fase 3)

TMDB key vai como secret server-side (`TMDB_API_KEY`).

## Rotas (TanStack file-based)

- `/` landing (hero, features, CTA)
- `/auth` login/signup (email+senha + Google)
- `/_authenticated/app` dashboard (carrosséis: Continuar, Recentes, Favoritos, Lista, Não assistidos, Coleções, Aleatórios)
- `/_authenticated/library` grid com filtros/ordenação/visualizações
- `/_authenticated/search` busca instantânea (TMDB + biblioteca)
- `/_authenticated/movie/$id` página do filme (hero backdrop, poster, ações, semelhantes)
- `/_authenticated/collections` + `/collections/$id`
- `/_authenticated/favorites`
- `/_authenticated/lists` + `/lists/$id`
- `/_authenticated/history`
- `/_authenticated/uploads` (placeholder "Fase 2 — em breve")
- `/_authenticated/settings` (tema, idioma, perfis, qualidade padrão)
- `/_authenticated/discover` "Hoje para Você" (stub determinístico)
- `/_authenticated/stats`
- `/_authenticated/admin` (gated por `has_role('admin')`)

## Componentes-chave

- `<AppSidebar/>` colapsável com active state
- `<MovieCard/>` (poster, hover info, ações rápidas)
- `<MovieCarousel/>` horizontal scroll com setas
- `<MovieHero/>` backdrop fullbleed com gradiente
- `<AddMovieDialog/>` busca TMDB → adiciona à biblioteca
- `<CineVaultCopilot/>` FAB (UI pronta, mensagem "ativando na fase 3")
- `<PlayerPlaceholder/>` botão "Assistir" mostra modal explicando fase 2

## Player / Upload / Watch Party / Download Offline / IA

UI presente mas com estados "em breve" elegantes — sem mocks falsos de funcionalidade que não existe. Estrutura de dados já comporta progresso, posições, salas.

## Fora desta fase (entram em fases seguintes)

- Player real, upload R2, streaming HLS — Fase 2
- Copiloto IA real, busca em linguagem natural — Fase 3
- Watch Party, download offline, comentários, reações — Fase 4

## O que preciso de você

**Chave da TMDB API** (gratuita em themoviedb.org → Settings → API). Vou pedir via `add_secret` quando começar a integração TMDB. Se não tiver agora, construo tudo e ligamos a TMDB depois — a UI roda com biblioteca vazia + "adicione seu primeiro filme".

Posso prosseguir?

Está quase perfeito, mas quero que o projeto de chama MyVault, e considere essas considerações finais:Toda funcionalidade nova deve ser implementada por meio de módulos independentes, sem alterar componentes existentes sempre que possível. Adotar arquitetura plugin-first, utilizando providers e interfaces para Storage, Metadata, AI, Player e Social, permitindo adicionar novos serviços ou substituir implementações sem refatoração do núcleo do sistema. Priorizar extensibilidade, performance e manutenibilidade sobre velocidade de implementação.”