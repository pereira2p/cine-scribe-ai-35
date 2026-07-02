import Dexie, { type Table } from "dexie";

export interface LocalFile {
  path: string;
  name: string;
  size: number;
  lastModified: number;
  handle?: FileSystemFileHandle;
  movieId?: number;
  addedAt: number;
}

export interface LocalCastMember {
  name: string;
  character?: string;
  profile?: string | null;
}

export interface LocalMovie {
  tmdbId: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  releaseDate?: string;
  releaseYear?: number;
  posterPath?: string | null;
  backdropPath?: string | null;
  voteAverage?: number;
  genres?: string[];
  runtime?: number;
  director?: string;
  cast?: LocalCastMember[];
  trailerKey?: string;
  filePath?: string;
  addedAt: number;
}

export interface Progress {
  movieId: number;
  position: number;
  duration: number;
  updatedAt: number;
  completed?: boolean;
}

export interface Favorite {
  movieId: number;
  createdAt: number;
}

export interface HistoryEntry {
  id?: number;
  movieId: number;
  watchedAt: number;
  completed: boolean;
}

export interface Setting<T = unknown> {
  key: string;
  value: T;
}

class CineDB extends Dexie {
  files!: Table<LocalFile, string>;
  movies!: Table<LocalMovie, number>;
  progress!: Table<Progress, number>;
  favorites!: Table<Favorite, number>;
  history!: Table<HistoryEntry, number>;
  settings!: Table<Setting, string>;

  constructor() {
    super("cinevault");
    this.version(1).stores({
      files: "path, movieId, addedAt",
      movies: "tmdbId, title, releaseYear, addedAt, voteAverage",
      progress: "movieId, updatedAt",
      favorites: "movieId, createdAt",
      history: "++id, movieId, watchedAt",
      settings: "key",
    });
  }
}

let _db: CineDB | null = null;
export function getDb(): CineDB {
  if (typeof window === "undefined") {
    throw new Error("Local DB is browser-only");
  }
  if (!_db) _db = new CineDB();
  return _db;
}

// Convenience proxy — safe to import at module top-level in client components.
export const db = new Proxy({} as CineDB, {
  get(_target, prop) {
    return (getDb() as unknown as Record<PropertyKey, unknown>)[prop];
  },
});