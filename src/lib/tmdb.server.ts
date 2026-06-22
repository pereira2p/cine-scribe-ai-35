/**
 * TMDB metadata provider — server-only (uses TMDB_API_KEY).
 * Implements MetadataProvider so it can be swapped for OMDb/Trakt later.
 */
import type { MetadataDetail, MetadataProvider, MetadataSearchResult } from "./providers/metadata";

const TMDB_BASE = "https://api.themoviedb.org/3";

function imgUrl(path: string | null | undefined, size: "w200" | "w342" | "w500" | "w780" | "original" = "w500") {
  if (!path) return undefined;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

async function tmdb<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY n\u00e3o configurada.");
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDB ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

interface TmdbSearchResp {
  results: Array<{
    id: number;
    title: string;
    original_title?: string;
    release_date?: string;
    overview?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    vote_average?: number;
  }>;
}
interface TmdbDetailResp {
  id: number;
  imdb_id?: string;
  title: string;
  original_title?: string;
  release_date?: string;
  overview?: string;
  tagline?: string;
  runtime?: number;
  original_language?: string;
  origin_country?: string[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  status?: string;
  genres: Array<{ id: number; name: string }>;
  belongs_to_collection?: { id: number; name: string; poster_path?: string | null; backdrop_path?: string | null } | null;
  credits?: {
    cast: Array<{ id: number; name: string; character?: string; order?: number; profile_path?: string | null }>;
    crew: Array<{ id: number; name: string; job: string; profile_path?: string | null }>;
  };
  videos?: { results: Array<{ key: string; site: string; type: string; official?: boolean }> };
}

export const TmdbProvider: MetadataProvider = {
  id: "tmdb",
  async search(query, opts) {
    if (!query.trim()) return [];
    const data = await tmdb<TmdbSearchResp>("/search/movie", {
      query,
      language: opts?.language ?? "pt-BR",
      include_adult: "false",
      year: opts?.year,
    });
    return data.results.slice(0, 20).map<MetadataSearchResult>((r) => ({
      source: "tmdb",
      id: String(r.id),
      title: r.title,
      originalTitle: r.original_title,
      year: r.release_date ? Number(r.release_date.slice(0, 4)) : undefined,
      overview: r.overview,
      posterUrl: imgUrl(r.poster_path, "w342"),
      backdropUrl: imgUrl(r.backdrop_path, "w780"),
      rating: r.vote_average,
    }));
  },
  async getDetail(id, opts) {
    const data = await tmdb<TmdbDetailResp>(`/movie/${id}`, {
      language: opts?.language ?? "pt-BR",
      append_to_response: "credits,videos",
    });
    const trailer =
      data.videos?.results.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
      data.videos?.results.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
      data.videos?.results.find((v) => v.site === "YouTube");
    return {
      source: "tmdb",
      id: String(data.id),
      imdbId: data.imdb_id,
      title: data.title,
      originalTitle: data.original_title,
      year: data.release_date ? Number(data.release_date.slice(0, 4)) : undefined,
      overview: data.overview,
      tagline: data.tagline,
      releaseDate: data.release_date,
      runtimeMinutes: data.runtime,
      originalLanguage: data.original_language,
      originCountry: data.origin_country?.[0],
      posterUrl: imgUrl(data.poster_path, "w500"),
      backdropUrl: imgUrl(data.backdrop_path, "original"),
      rating: data.vote_average,
      voteCount: data.vote_count,
      popularity: data.popularity,
      genres: data.genres ?? [],
      cast: (data.credits?.cast ?? []).slice(0, 15).map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        order: c.order,
        profilePath: c.profile_path,
      })),
      crew: (data.credits?.crew ?? [])
        .filter((c) => ["Director", "Writer", "Screenplay", "Producer"].includes(c.job))
        .map((c) => ({ id: c.id, name: c.name, job: c.job, profilePath: c.profile_path })),
      trailerKey: trailer?.key,
      collectionId: data.belongs_to_collection?.id,
      collectionName: data.belongs_to_collection?.name,
    };
  },
};

export const tmdbImg = imgUrl;