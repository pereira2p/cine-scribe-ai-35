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

export function tmdbImage(
  path: string | null | undefined,
  size: "w200" | "w342" | "w500" | "w780" | "w1280" | "original" = "w500",
): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function searchMovie(query: string, year?: number): Promise<TmdbSearchHit[]> {
  const { tmdbSearchMovie } = await import("./tmdb.functions");
  const data = await tmdbSearchMovie({ data: { query, ...(year ? { year } : {}) } });
  return data.results ?? [];
}

export async function fetchMovie(id: number): Promise<TmdbMovieDetail> {
  const { tmdbMovieDetail } = await import("./tmdb.functions");
  return tmdbMovieDetail({ data: { id } });
}