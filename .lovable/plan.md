# Fase 3 — CineVault MVP utilizável hoje

Foco absoluto: **Pesquisar → Adicionar → Ver na biblioteca → Assistir**, sem erros, com uma IA central que entende qualquer entrada do usuário.

Tudo que não estiver 100% funcional é ocultado atrás de um selo discreto "Em desenvolvimento".

---

## 1. Limpeza da interface (remover ruído)

Ocultar dos menus (sidebar + bottom nav) e bloquear rotas com tela "Em desenvolvimento":
- Watch Party
- Downloads offline
- Stats (mantém só se já funcionar; senão esconde)
- Activity Feed inline
- Botão "Transmitir" do player (selo "em breve")

Manter visível: **Home, Buscar, Biblioteca, Favoritos, Coleções, Histórico, Configurações**.

Sidebar e bottom nav reduzidos ao essencial.

---

## 2. Nova Home — campo único universal

Substituir a home atual por uma tela inspirada em Spotlight/Arc:

```text
┌────────────────────────────────────────────┐
│                                            │
│   O que você quer assistir hoje?           │
│   ┌──────────────────────────────────────┐ │
│   │ Interestelar, Nolan, um sci-fi...    │ │
│   └──────────────────────────────────────┘ │
│   [ Buscar com IA ]   [ Adicionar filme ] │
│                                            │
│   Continuar assistindo · Recém-adicionados │
└────────────────────────────────────────────┘
```

Um único `<input>` aceita: título, diretor, ator, gênero, URL, ou pergunta em linguagem natural.

Abaixo: dois ou três carrosséis curtos (Continuar, Recém-adicionados, Favoritos) — só aparecem se houver dados.

---

## 3. Universal AI Search (núcleo da Fase 3)

Criar `src/lib/search/universal.functions.ts` com **uma única server fn** `universalSearch({ query })`.

Fluxo interno:

1. **Classificador de intenção** (regex barata + fallback Gemini Flash):
   - URL → roteia para provider apropriado (Archive, URL direta).
   - Texto curto sem operadores → busca paralela em **Biblioteca + TMDB**.
   - Frase natural ("quero um sci-fi curto", "parecido com Duna") → Gemini extrai filtros estruturados (genre, year_min, similar_to, runtime_max, person) e chama TMDB com `discover/movie`.
2. **Execução paralela** nos providers ativos via `Promise.allSettled` (nunca quebra se um falhar).
3. **Normalização** para `UnifiedResult { source, externalId, title, year, posterUrl, overview, rating, alreadyInLibrary, playableUrl? }`.
4. **Ranking simples**: biblioteca primeiro, depois TMDB por popularidade, depois Archive.
5. Erros viram aviso amigável por fonte ("Não foi possível acessar TMDB agora").

Providers nesta fase:
- ✅ Library (Supabase)
- ✅ TMDB (search + discover)
- ✅ Internet Archive
- ✅ URL direta
- 🚧 Google Drive / OneDrive / Dropbox / NAS → ficam como `available: false` no registry (não aparecem em busca, mas a interface mostra "em breve" só na tela Sistema).

---

## 4. Resultados unificados

Página `/search?q=...` (ou inline na home após enter):

Card padrão com poster, título, ano, nota, sinopse curta, **badge de origem** (Biblioteca / TMDB / Archive / URL).

Botões contextuais:
- Já está na biblioteca → **Assistir** + **Favoritar**.
- TMDB → **Adicionar à biblioteca** (metadata-only).
- Archive/URL → **Adicionar e assistir** (cria movie row com `storage_key=url`).

---

## 5. Importação ponta-a-ponta (refatoração)

Garantir que **todo botão "Adicionar" funcione sem erro**:

- `addFromTmdb(tmdbId)` — server fn que: busca detalhes TMDB, baixa poster/backdrop URLs (apenas referenciados, sem rehospedar), insere `movies`, `movie_genres`, `movie_credits`, registra `activity_feed`.
- `addFromArchive({ identifier, fileName })` — usa `archiveAnalyze` existente + `createMovieFromUrl`.
- `addFromUrl({ url, title? })` — usa `urlAnalyze` + `createMovieFromUrl`.

Todos retornam `{ movieId }` e a UI:
- toast "Filme adicionado com sucesso"
- invalida queries de biblioteca
- oferece ação inline "Assistir agora".

Tratamento de erro centralizado (`friendlyError(e)`): mapeia mensagens técnicas para PT-BR amigável.

---

## 6. Player — assistir imediatamente

Já existe `MyVaultPlayer` + rota `/watch/$movieId`. Garantir:
- Filmes com `storage_key` sendo URL externa (http/https) → tocam direto, sem assinar.
- Filmes com `storage_provider='r2'` → fluxo presigned atual.
- MKV/MOV sem suporte nativo → mensagem amigável "Este formato pode não tocar no navegador. Tente baixar".

---

## 7. Universal Import Dialog (botão "Adicionar filme")

Reaproveitar `UniversalImportDialog` existente, simplificar abas: **TMDB · Link · Upload**.
- "Link" detecta automaticamente se é Archive ou URL direta (usa `universalSearch` com a URL).
- Esconder Google Drive/OneDrive/Dropbox/NAS (mover para Sistema → "em breve").

---

## 8. Página Sistema (diagnóstico)

Nova rota `/_authenticated/system`:

| Serviço | Status | Ação |
|---|---|---|
| TMDB API | ✓ Online | Testar |
| Banco de dados | ✓ Online | Testar |
| Storage R2 | ✓ Online | Testar |
| Internet Archive | ✓ Online | Testar |
| Google Drive | ⏳ Em breve | — |
| OneDrive | ⏳ Em breve | — |

Cada teste é uma server fn que retorna `{ ok, latencyMs, message }`.

---

## 9. Mensagens de erro (UX)

Helper `friendlyError(e: unknown): string` usado em todos os `onError`. Tabela de mapeamento:

| Causa | Mensagem |
|---|---|
| fetch falhou | "Não foi possível acessar essa fonte agora." |
| sem resultados | "Nenhum filme encontrado." |
| 429 / rate limit | "Muitas requisições. Tente novamente em alguns segundos." |
| 402 (Lovable AI) | "Limite da IA atingido. Tente uma busca simples." |
| qualquer outro | "Algo deu errado. Tente novamente." |

---

## Detalhes técnicos

**Novos arquivos:**
- `src/lib/search/universal.functions.ts` — `universalSearch`, `addFromTmdb`, `addFromArchive` (wrappers).
- `src/lib/search/intent.server.ts` — classificador + chamada Gemini.
- `src/lib/errors.ts` — `friendlyError`.
- `src/components/UniversalSearchBar.tsx` — campo da home.
- `src/components/SearchResultCard.tsx` — card unificado.
- `src/routes/_authenticated/system.tsx` — diagnóstico.

**Modificados:**
- `src/routes/_authenticated/app.tsx` (home) — nova UI.
- `src/routes/_authenticated/search.tsx` — usa `universalSearch`.
- `src/components/UniversalImportDialog.tsx` — abas reduzidas.
- `src/components/AppSidebar.tsx` + `BottomNav.tsx` — remove links em desenvolvimento.
- `src/routes/_authenticated/{watch-party,downloads}.tsx` — placeholder "Em desenvolvimento".

**Reuso:** `tmdb.functions.ts`, `imports.functions.ts`, `copilot.functions.ts`, `MyVaultPlayer`, R2 stack — sem alterações estruturais.

**IA:** `google/gemini-3-flash-preview` via Lovable AI Gateway (já configurado em `copilot.functions.ts`). Sem novos secrets.

**Sem migrations** nesta fase — usa schema atual.

---

## Fora desta fase

Watch Party real · Download offline real · Chromecast/AirPlay nativos · Comentários · Social · Capacitor · HLS · Recomendações personalizadas.

Voltam após o ciclo Pesquisar→Adicionar→Assistir estar sólido.

---

**Posso executar?**
