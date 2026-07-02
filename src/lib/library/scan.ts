import { db, type LocalMovie } from "@/lib/db/local";
import {
  getStoredRoot,
  pickRootDirectory,
  requestPermission,
  scanDirectory,
  type ScannedFile,
} from "./fs";
import { identifyFile } from "./identify";
import { fetchMovie, tmdbImage } from "@/lib/tmdb/client";

export type ScanEvent =
  | { type: "start" }
  | { type: "scanned"; total: number }
  | { type: "progress"; current: number; total: number; name: string }
  | { type: "done"; added: number }
  | { type: "error"; message: string };

export type ScanListener = (event: ScanEvent) => void;

export async function ensureRoot(pickIfMissing = false): Promise<FileSystemDirectoryHandle | null> {
  let root = await getStoredRoot();
  if (!root && pickIfMissing) root = await pickRootDirectory();
  if (root) {
    const ok = await requestPermission(root);
    if (!ok) return null;
  }
  return root;
}

async function enrichFromTmdb(tmdbId: number, filePath: string): Promise<LocalMovie> {
  const detail = await fetchMovie(tmdbId);
  const releaseYear = detail.release_date ? Number(detail.release_date.slice(0, 4)) : undefined;
  const crew = detail.credits?.crew ?? [];
  const director = crew.find((c) => c.job === "Director")?.name;
  const cast = (detail.credits?.cast ?? [])
    .slice(0, 12)
    .map((c) => ({ name: c.name, character: c.character, profile: c.profile_path }));
  const trailer = (detail.videos?.results ?? []).find(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  )?.key;
  return {
    tmdbId: detail.id,
    title: detail.title,
    originalTitle: detail.original_title,
    overview: detail.overview,
    releaseDate: detail.release_date,
    releaseYear,
    posterPath: tmdbImage(detail.poster_path, "w500"),
    backdropPath: tmdbImage(detail.backdrop_path, "w1280"),
    voteAverage: detail.vote_average,
    genres: detail.genres.map((g) => g.name),
    runtime: detail.runtime ?? undefined,
    director,
    cast,
    trailerKey: trailer,
    filePath,
    addedAt: Date.now(),
  };
}

export async function processFile(
  file: ScannedFile,
): Promise<{ added: boolean; movie?: LocalMovie }> {
  const existing = await db.files.get(file.path);
  await db.files.put({
    path: file.path,
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    handle: file.handle,
    movieId: existing?.movieId,
    addedAt: existing?.addedAt ?? Date.now(),
  });
  if (existing?.movieId) {
    const m = await db.movies.get(existing.movieId);
    if (m) return { added: false, movie: m };
  }
  const { candidates } = await identifyFile(file.name);
  const best = candidates[0];
  if (!best) return { added: false };
  const movie = await enrichFromTmdb(best.id, file.path);
  await db.movies.put(movie);
  await db.files.update(file.path, { movieId: movie.tmdbId });
  return { added: true, movie };
}

export async function fullScan(listener?: ScanListener): Promise<number> {
  listener?.({ type: "start" });
  const root = await ensureRoot();
  if (!root) {
    listener?.({ type: "error", message: "Selecione uma pasta primeiro." });
    return 0;
  }
  const files = await scanDirectory(root);
  listener?.({ type: "scanned", total: files.length });
  let added = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i]!;
    listener?.({ type: "progress", current: i + 1, total: files.length, name: f.name });
    try {
      const r = await processFile(f);
      if (r.added) added++;
    } catch (e) {
      console.warn("scan:", f.name, e);
    }
  }
  listener?.({ type: "done", added });
  return added;
}

export async function relinkMovie(tmdbId: number, filePath: string): Promise<void> {
  const movie = await enrichFromTmdb(tmdbId, filePath);
  await db.movies.put(movie);
  await db.files.update(filePath, { movieId: tmdbId });
}