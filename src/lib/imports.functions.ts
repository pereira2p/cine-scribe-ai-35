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
    let head: Response;
    try {
      head = await fetch(data.url, { method: "HEAD" });
    } catch {
      throw new Error("Não consegui acessar essa URL.");
    }
    const mime = head.headers.get("content-type") ?? "";
    const size = Number(head.headers.get("content-length") ?? 0);
    if (!/^video\//.test(mime) && !/\.(mp4|mkv|webm|mov)(\?|$)/i.test(data.url)) {
      throw new Error("A URL não aparenta ser um arquivo de vídeo.");
    }
    const name = decodeURIComponent(new URL(data.url).pathname.split("/").pop() ?? "video.mp4");
    return { url: data.url, mimeType: mime || "video/mp4", size: size || undefined, name };
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