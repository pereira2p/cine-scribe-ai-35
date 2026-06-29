# Refatoração do Pipeline de Importação

Hoje cada fonte (TMDB, URL, Archive, Upload) chama lógicas separadas e nenhuma faz enriquecimento completo. Vou unificar tudo em um único pipeline `enrichMovie` que roda automaticamente após qualquer importação.

## 1. Pipeline único `enrichMovie(movieId)`

Novo arquivo `src/lib/enrichment/pipeline.functions.ts`. Server function disparada ao final de qualquer importação. Executa em ordem, **nunca aborta** — cada passo grava o que conseguir e segue para o próximo, registrando status em `background_jobs`.

```text
Passo 1  Identificação      → TMDB ID já presente? senão IA (Gemini) infere título+ano do filename/URL → TMDB search
Passo 2  Detalhes TMDB      → /movie/{id}?append_to_response=videos,credits,images,release_dates,translations
Passo 3  Créditos           → upsert people + movie_credits (cast + director + producer + writer)
Passo 4  Coleção            → /collection/{id} → cria/atualiza collections + collection_movies
Passo 5  Cache de assets    → baixa poster/backdrop/logo/thumbnail e envia ao R2 → salva em movie_assets
Passo 6  Tags inteligentes  → IA classifica em smart_tags pré-definidas usando sinopse/genres/keywords TMDB
Passo 7  Finalização        → marca movies.enrichment_status='complete' + activity_feed
```

Cada passo é envolvido por `try/catch` que grava o erro em `background_jobs.error` mas não propaga.

## 2. Pontos de disparo

Após inserir o filme, chamar `enrichMovie({movieId})` (fire-and-forget no cliente via mutation com `onSuccess`):
- `tmdbImport` (já tem TMDB ID)
- `createMovieFromUrl` (URL/Archive/YouTube — passo 1 precisa identificar)
- `completeUpload` (R2 — passo 1 usa filename)
- futuros Drive/OneDrive

## 3. Cache de assets (R2)

Novo `src/lib/enrichment/assets.server.ts`:
- baixa de `image.tmdb.org/t/p/original{path}`
- envia para R2 em `assets/{movieId}/{kind}-{size}.jpg`
- gera URL pública via `R2_PUBLIC_BASE_URL`
- insere em `movie_assets` (kind: poster|backdrop|logo|thumbnail|banner, size, url, source)
- atualiza `movies.poster_path`/`backdrop_path` com a URL local
- se falhar, mantém URL TMDB como fallback

## 4. Identificação por IA

Quando não há TMDB ID (uploads/URLs), `src/lib/enrichment/identify.server.ts`:
- limpa filename (remove qualidade, codec, ano em []) 
- envia a Gemini com prompt: "extraia título e ano do filme deste nome/URL"
- usa resposta para TMDB search → escolhe melhor match (popularidade + ano)
- retorna `tmdbId` para alimentar passo 2

## 5. Tags inteligentes

Vocabulário fixo em migration: Cult, Mind-blowing, Cyberpunk, Oscar, Slow Burn, Plot Twist, Espacial, Viagem no Tempo, Heist, Noir, Coming-of-Age, Tear-jerker, Feel-good, Body Horror, Found Footage.

`src/lib/enrichment/tags.server.ts` envia sinopse + gêneros + keywords TMDB ao Gemini com a lista fixa, pedindo no máximo 5 tags em JSON. Insere em `movie_smart_tags`.

## 6. Schema

Migration adiciona:
- `movies.enrichment_status` enum: `pending | partial | complete | failed`
- `movies.enrichment_error text`
- `movies.tmdb_keywords text[]`
- `movies.budget bigint`, `revenue bigint`, `status text`, `certification text`, `logo_path text`, `spoken_languages text[]`
- seed em `smart_tags` com vocabulário acima

## 7. Página de diagnóstico expandida

`src/routes/_authenticated/system.tsx` ganha aba "Importação" testando individualmente:
- TMDB `/movie/550` (detalhes)
- TMDB imagens (`/movie/550/images`)
- TMDB credits, collection, videos
- R2 put + get de byte de teste
- Lovable AI (ping curto)
- Banco (insert/select dry-run em tabela temp)

Cada item: ✓ ⚠ ✗ + latência + botão "Testar novamente" (já existe; vou modularizar por categoria).

## 8. UI de feedback

`UniversalImportDialog` mostra após "Adicionar" um stepper ao vivo (assinatura realtime em `background_jobs` por `movie_id`):
```
✓ Filme identificado: Interestelar (2014)
✓ Poster baixado
✓ Backdrop baixado
✓ Trailer encontrado
✓ Elenco importado (89 pessoas)
✓ Coleção: Trilogia Nolan
✓ Tags: Mind-blowing, Espacial, Slow Burn
```

## 9. Placeholders elegantes

`MovieCard` e página de detalhe já tratam null, mas reforço:
- poster ausente → gradient com título grande
- backdrop ausente → blur do poster
- trailer ausente → botão desabilitado com tooltip
- elenco vazio → "Elenco ainda não disponível"

Nunca campo em branco — sempre placeholder.

## Arquivos a criar/editar

**Novos**
- `src/lib/enrichment/pipeline.functions.ts`
- `src/lib/enrichment/identify.server.ts`
- `src/lib/enrichment/assets.server.ts`
- `src/lib/enrichment/tags.server.ts`
- `src/lib/enrichment/tmdb-detail.server.ts` (wrapper TMDB com append_to_response)
- `src/components/ImportProgressStepper.tsx`

**Editar**
- `src/lib/tmdb.functions.ts` (dispara enrichment ao fim)
- `src/lib/imports.functions.ts` (dispara enrichment)
- `src/lib/uploads.functions.ts` (dispara enrichment em completeUpload)
- `src/components/UniversalImportDialog.tsx` (mostra stepper)
- `src/routes/_authenticated/system.tsx` (aba importação)
- `src/components/MovieCard.tsx` + `src/routes/_authenticated/movie.$movieId.tsx` (placeholders)

**Migration**
- novas colunas em `movies`
- seed `smart_tags`
- `background_jobs` já existe; só uso

## Fora de escopo (próxima fase)

- Google Drive / OneDrive reais (precisa OAuth por usuário — já está como "em desenvolvimento")
- Hash-based identification (precisa lib de hash de vídeo; por ora só filename+IA)
- Re-enriquecimento em massa de filmes antigos (vou expor botão "Re-enriquecer" no detalhe, mas não rodo batch automático)

Posso prosseguir?
