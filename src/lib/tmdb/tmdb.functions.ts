import { createServerFn } from "@tanstack/react-start";

const BASE = "https://api.themoviedb.org/3";

function key(): string {
  const k = process.env.TMDB_API_KEY;
  if (!k) throw new Error("TMDB_API_KEY não configurado no servidor.");
  return k;
}

export const tmdbSearchMovie = createServerFn({ method: "GET" })
  .validator((v: { query: string; year?: number }) => v)
  .handler(async ({ data }) => {
    if (!data.query.trim()) return { results: [] as unknown[] };
    const url = new URL(`${BASE}/search/movie`);
    url.searchParams.set("query", data.query);
    url.searchParams.set("language", "pt-BR");
    url.searchParams.set("include_adult", "false");
    if (data.year) url.searchParams.set("year", String(data.year));
    url.searchParams.set("api_key", key());
    const r = await fetch(url.toString());
    if (!r.ok) throw new Error(`TMDB ${r.status}`);
    return (await r.json()) as { results: unknown[] };
  });

export const tmdbMovieDetail = createServerFn({ method: "GET" })
  .validator((v: { id: number }) => v)
  .handler(async ({ data }) => {
    const url = new URL(`${BASE}/movie/${data.id}`);
    url.searchParams.set("language", "pt-BR");
    url.searchParams.set("append_to_response", "credits,videos");
    url.searchParams.set("api_key", key());
    const r = await fetch(url.toString());
    if (!r.ok) throw new Error(`TMDB ${r.status}`);
    return (await r.json()) as unknown;
  });