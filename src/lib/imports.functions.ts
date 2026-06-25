import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Extracts an archive.org item id from a full URL or returns the input as-is. */
function parseArchiveId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (!/archive\.org$/i.test(u.hostname)) return null;
    const m = u.pathname.match(/\/(details|download|embed)\/([^/]+)/i);
    return m?.[2] ?? null;
  } catch {
    return /^[\w.\-]+$/.test(s) ? s : null;
  }
}

const VIDEO_FORMATS = new Set([
  "h.264", "h.264 ia", "matroska", "mpeg4", "512kb mpeg4", "ogg video",
  "webm", "mp4", "quicktime",
]);

const ArchiveAnalyze = z.object({ input: z.string().min(1).max(500) });

export const archiveAnalyze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ArchiveAnalyze.parse(i))
  .handler(async ({ data }) => {
    const id = parseArchiveId(data.input);
    if (!id) throw new Error("Link do Internet Archive inválido. Cole um link como https://archive.org/details/...");
    const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`, {
      headers: { "user-agent": "CineVault/1.0" },
    });
    if (!res.ok) throw new Error(`Internet Archive retornou ${res.status}`);
    const json = (await res.json()) as {
      metadata?: { title?: string; year?: string; description?: string };
      files?: Array<{ name: string; format?: string; size?: string; length?: string }>;
    };
    const meta = json.metadata ?? {};
    const files = (json.files ?? [])
      .filter((f) => {
        const fmt = (f.format ?? "").toLowerCase();
        const ext = f.name.toLowerCase().split(".").pop() ?? "";
        return VIDEO_FORMATS.has(fmt) || ["mp4", "mkv", "webm", "ogv", "mov"].includes(ext);
      })
      .map((f) => ({
        name: f.name,
        url: `https://archive.org/download/${encodeURIComponent(id)}/${encodeURI(f.name)}`,
        format: f.format ?? "",
        size: f.size ? Number(f.size) : undefined,
        duration: f.length ? parseFloat(f.length) : undefined,
      }))
      .sort((a, b) => {
        const isMp4 = (n: string) => n.toLowerCase().endsWith(".mp4") ? 0 : 1;
        return isMp4(a.name) - isMp4(b.name);
      });
    if (!files.length) throw new Error("Nenhum arquivo de vídeo compatível neste item.");
    return {
      id,
      title: meta.title ?? id,
      year: meta.year ? Number(meta.year) : undefined,
      description: meta.description?.toString().slice(0, 500),
      files,
    };
  });

const UrlAnalyze = z.object({ url: z.string().url() });
export const urlAnalyze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UrlAnalyze.parse(i))
  .handler(async ({ data }) => {
    // Be permissive: many CDNs reject HEAD or omit content-type. We only fail
    // when we can prove it's NOT a video. Otherwise we trust the user.
    let mime = "";
    let size = 0;
    try {
      const head = await fetch(data.url, { method: "HEAD", redirect: "follow" });
      mime = head.headers.get("content-type") ?? "";
      size = Number(head.headers.get("content-length") ?? 0);
    } catch {
      // ignore — we'll trust the extension
    }
    if (!mime) {
      try {
        const ranged = await fetch(data.url, {
          method: "GET",
          headers: { Range: "bytes=0-0" },
          redirect: "follow",
        });
        mime = ranged.headers.get("content-type") ?? "";
        const cr = ranged.headers.get("content-range");
        if (cr) {
          const total = Number(cr.split("/").pop());
          if (Number.isFinite(total)) size = total;
        }
      } catch {
        // still ignore — fall back to extension guess
      }
    }
    const extMatch = data.url.match(/\.(mp4|m4v|mkv|webm|mov|ogv|avi|ts|m3u8)(\?|#|$)/i);
    // Trust the user: never block import. The player will surface playback errors.
    const guessedMime = mime && !/^text\//i.test(mime)
      ? mime
      : extMatch
        ? extMatch[1].toLowerCase() === "mkv"
          ? "video/x-matroska"
          : extMatch[1].toLowerCase() === "webm"
            ? "video/webm"
            : extMatch[1].toLowerCase() === "m3u8"
              ? "application/vnd.apple.mpegurl"
              : "video/mp4"
        : "video/mp4";
    const name = decodeURIComponent(new URL(data.url).pathname.split("/").pop() || "video.mp4");
    return { url: data.url, mimeType: guessedMime, size: size || undefined, name };
  });

const CreateMovieFromUrl = z.object({
  title: z.string().min(1).max(255),
  url: z.string().url(),
  mimeType: z.string().min(1).max(120).default("video/mp4"),
  size: z.number().int().positive().optional(),
  posterUrl: z.string().url().optional(),
  year: z.number().int().min(1800).max(3000).optional(),
  overview: z.string().max(2000).optional(),
  source: z.enum(["internet_archive", "url"]),
});

/** Creates a movie row that streams directly from an external URL (no R2 upload). */
export const createMovieFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateMovieFromUrl.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("movies")
      .insert({
        user_id: userId,
        title: data.title,
        release_year: data.year ?? null,
        overview: data.overview ?? null,
        poster_path: data.posterUrl ?? null,
        storage_provider: data.source,
        storage_key: data.url,
        mime_type: data.mimeType,
        file_size: data.size ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("activity_feed").insert({
      user_id: userId,
      kind: "movie_added",
      payload: { movie_id: row.id, title: data.title, source: data.source },
    });
    return { movieId: row.id };
  });