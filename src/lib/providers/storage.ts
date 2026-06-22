/**
 * Storage provider interface — plugin-first architecture.
 *
 * Phase 1: only `TmdbOnlyStorageProvider` is wired (no video files yet).
 * Phase 2 implementations: R2StorageProvider, GoogleDriveStorageProvider,
 * OneDriveStorageProvider, LocalStorageProvider — all conforming to this
 * interface so the player layer doesn't change when a new provider lands.
 */
export interface UploadInit {
  filename: string;
  size: number;
  mimeType: string;
}
export interface UploadHandle {
  uploadUrl: string;
  storageKey: string;
  headers?: Record<string, string>;
}
export interface StreamSource {
  url: string;
  mimeType: string;
  protocol: "mp4" | "hls" | "dash";
  expiresAt?: number;
}
export interface StorageProvider {
  readonly id: "tmdb_only" | "r2" | "gdrive" | "onedrive" | "local";
  /** Returns a one-shot signed URL the browser can PUT/POST the file to. */
  initUpload(init: UploadInit): Promise<UploadHandle>;
  /** Returns a streamable source for the player. */
  getStreamSource(storageKey: string): Promise<StreamSource>;
  /** Returns a temporary signed URL for download. */
  generateSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
  delete(storageKey: string): Promise<void>;
}

/** Placeholder provider used in Phase 1 — does not store any video files. */
export const TmdbOnlyStorageProvider: StorageProvider = {
  id: "tmdb_only",
  async initUpload() {
    throw new Error("Upload de v\u00eddeo ser\u00e1 ativado na Fase 2 (Cloudflare R2).");
  },
  async getStreamSource() {
    throw new Error("Streaming ser\u00e1 ativado na Fase 2.");
  },
  async generateSignedUrl() {
    throw new Error("URLs assinadas ser\u00e3o ativadas na Fase 2.");
  },
  async delete() {
    return;
  },
};

const registry = new Map<StorageProvider["id"], StorageProvider>();
registry.set(TmdbOnlyStorageProvider.id, TmdbOnlyStorageProvider);

export function registerStorageProvider(p: StorageProvider) {
  registry.set(p.id, p);
}
export function getStorageProvider(id: StorageProvider["id"]): StorageProvider {
  const p = registry.get(id);
  if (!p) throw new Error(`Storage provider n\u00e3o registrado: ${id}`);
  return p;
}

/** Default provider id chosen by the server (R2 when configured). */
export function defaultStorageProviderId(): StorageProvider["id"] {
  if (typeof process !== "undefined" && process.env?.R2_BUCKET) return "r2";
  return "tmdb_only";
}