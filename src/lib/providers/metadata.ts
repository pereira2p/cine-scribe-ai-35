/**
 * Metadata provider interface — pluggable source of movie info.
 * Phase 1: TMDB. Future: OMDb, IMDb, Trakt, Letterboxd.
 */
export interface MetadataSearchResult {
  source: string;
  id: string;
  title: string;
  originalTitle?: string;
  year?: number;
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating?: number;
}
export interface MetadataDetail extends MetadataSearchResult {
  runtimeMinutes?: number;
  releaseDate?: string;
  originalLanguage?: string;
  originCountry?: string;
  genres: { id: number; name: string }[];
  cast: { id: number; name: string; character?: string; order?: number; profilePath?: string | null }[];
  crew: { id: number; name: string; job: string; profilePath?: string | null }[];
  trailerKey?: string;
  tagline?: string;
  voteCount?: number;
  popularity?: number;
  collectionId?: number;
  collectionName?: string;
  imdbId?: string;
}
export interface MetadataProvider {
  readonly id: string;
  search(query: string, opts?: { language?: string; year?: number }): Promise<MetadataSearchResult[]>;
  getDetail(id: string, opts?: { language?: string }): Promise<MetadataDetail>;
}