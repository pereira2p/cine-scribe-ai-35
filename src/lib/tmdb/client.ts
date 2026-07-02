export interface TmdbSearchHit {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  overview: string;
  popularity: number;
}

export interface TmdbCastMember {
  name: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
}

export interface TmdbCrewMember {
  name: string;
  job?: string;
  department?: string;
}

export interface TmdbVideo {
  site: string;
  type: string;
  key: string;
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  runtime: number | null;
  genres: { id: number; name: string }[];
  credits?: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
  videos?: { results: TmdbVideo[] };
}

async function tget<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const base =
    typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(`/api/public/tmdb${path}`, base);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB error ${res.status}`);
  return (await res.json()) as T;
}

export function tmdbImage(
  path: string | null | undefined,
  size: "w200" | "w342" | "w500" | "w780" | "w1280" | "original" = "w500",
): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function searchMovie(query: string, year?: number): Promise<TmdbSearchHit[]> {
  const data = await tget<{ results: TmdbSearchHit[] }>("/search", {
    q: query,
    ...(year ? { year } : {}),
  });
  return data.results ?? [];
}

export async function fetchMovie(id: number): Promise<TmdbMovieDetail> {
  return tget<TmdbMovieDetail>(`/movie/${id}`);
}