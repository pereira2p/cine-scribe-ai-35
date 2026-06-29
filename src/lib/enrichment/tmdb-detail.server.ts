/**
 * Fetches the full TMDB movie detail in a single request, including
 * videos, credits, images, keywords, release dates and translations.
 */
const TMDB_BASE = "https://api.themoviedb.org/3";

export interface TmdbFullDetail {
  id: number;
  imdb_id?: string | null;
  title: string;
  original_title?: string;
  overview?: string;
  tagline?: string;
  release_date?: string;
  runtime?: number | null;
  original_language?: string;
  origin_country?: string[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  status?: string;
  budget?: number;
  revenue?: number;
  genres: Array<{ id: number; name: string }>;
  spoken_languages?: Array<{ iso_639_1: string; english_name: string }>;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
  } | null;
  credits?: {
    cast: Array<{ id: number; name: string; character?: string; order?: number; profile_path?: string | null }>;
    crew: Array<{ id: number; name: string; job: string; profile_path?: string | null }>;
  };
  videos?: { results: Array<{ key: string; site: string; type: string; official?: boolean }> };
  images?: {
    logos?: Array<{ file_path: string; iso_639_1?: string | null }>;
    posters?: Array<{ file_path: string; iso_639_1?: string | null }>;
    backdrops?: Array<{ file_path: string }>;
  };
  keywords?: { keywords: Array<{ id: number; name: string }> };
  release_dates?: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{ certification: string; iso_639_1?: string; type: number }>;
    }>;
  };
}

export async function fetchTmdbDetail(
  tmdbId: number,
  language = "pt-BR",
): Promise<TmdbFullDetail> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY não configurada.");
  const url = new URL(`${TMDB_BASE}/movie/${tmdbId}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", language);
  url.searchParams.set(
    "append_to_response",
    "videos,credits,images,keywords,release_dates,translations",
  );
  url.searchParams.set("include_image_language", "pt,en,null");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${await res.text().catch(() => "")}`);
  return (await res.json()) as TmdbFullDetail;
}

export async function tmdbSearchOne(query: string, year?: number): Promise<number | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY não configurada.");
  const url = new URL(`${TMDB_BASE}/search/movie`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("query", query);
  url.searchParams.set("language", "pt-BR");
  if (year) url.searchParams.set("year", String(year));
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as { results: Array<{ id: number; popularity?: number }> };
  if (!data.results?.length) return null;
  return data.results.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0].id;
}

export function tmdbImg(path?: string | null, size: "w200" | "w342" | "w500" | "w780" | "original" = "original") {
  if (!path) return undefined;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}