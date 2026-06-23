/**
 * ImportProvider — plugin-first interface for any video source.
 * Phase 2: TMDB metadata-only, Cloudflare R2 upload, Internet Archive, URL direct.
 * Future: Google Drive, OneDrive, Dropbox, NAS, synced folder.
 */
export interface ImportCandidate {
  source: string;
  remoteId: string;
  title?: string;
  year?: number;
  posterUrl?: string;
  fileUrl?: string;
  mimeType?: string;
  size?: number;
  durationSeconds?: number;
}

export interface ImportPreview {
  candidates: ImportCandidate[];
  /** human-readable label of the original source (e.g. "Internet Archive: Big Buck Bunny") */
  label?: string;
}

export interface ImportProvider {
  readonly id: "tmdb" | "upload" | "url" | "internet_archive" | "gdrive" | "onedrive" | "dropbox" | "nas";
  readonly available: boolean;
  /** Parses a user input (URL, filename, search term) and returns candidates. */
  analyze(input: string): Promise<ImportPreview>;
}