import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Universal AI Search — single entry point that decides automatically
 * which provider to use based on the user's free-text input.
 *
 * Sources in this phase: Library (Supabase) + TMDB + URL/Archive detection.
 * Future providers (Drive/OneDrive/Dropbox/NAS) plug in here.
 */

export type UnifiedSource = "library" | "tmdb" | "internet_archive" | "url";

export interface UnifiedResult {
  source: UnifiedSource;
  /** Stable id for React keys: "{source}:{externalId}" */
  key: string;
  /** TMDB id, archive identifier, URL, or library movie id */
  externalId: string;
  title: string;
  year?: number;
  posterUrl?: string;
  overview?: string;
  rating?: number;
  /** When the same TMDB movie is already in the user's library */
  libraryMovieId?: string;
  /** Directly playable URL when available (archive/url) */
  playableUrl?: string;
  mimeType?: string;
}

function parseArchiveId(input: string): string | null {
  try {
    const u = new URL(input);
    if (!/archive\.org$/i.test(u.hostname)) return null;
    const m = u.pathname.match(/\/(details|download|embed)\/([^/]+)/i);
    return m?.[2] ?? null;
  } catch {
    return null;
  }
}

function isUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

const Input = z.object({ query: z.string().min(1).max(300) });

export const universalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const q = data.query.trim();
    const { supabase, userId } = context;
    const errors: Array<{ source: UnifiedSource; message: string }> = [];

    // 1. URL — route to archive or generic URL provider
    if (isUrl(q)) {
      const archiveId = parseArchiveId(q);
      if (archiveId) {
        try {
          const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(archiveId)}`);
          if (!res.ok) throw new Error(`Archive ${res.status}`);
          const json = (await res.json()) as {
            metadata?: { title?: string; year?: string; description?: string };
            files?: Array<{ name: string; format?: string; size?: string }>;
          };
          const meta = json.metadata ?? {};
          const file = (json.files ?? []).find((f) => /\.(mp4|webm|mkv|mov)$/i.test(f.name));
          const playableUrl = file
            ? `https://archive.org/download/${encodeURIComponent(archiveId)}/${encodeURI(file.name)}`
            : undefined;
          return {
            query: q,
            results: [
              {
                source: "internet_archive" as const,
                key: `internet_archive:${archiveId}`,
                externalId: archiveId,
                title: meta.title ?? archiveId,
                year: meta.year ? Number(meta.year) : undefined,
                overview: meta.description?.toString().slice(0, 400),
                playableUrl,
                mimeType: file?.name.endsWith(".mp4") ? "video/mp4" : undefined,
              },
            ] satisfies UnifiedResult[],
            errors,
          };
        } catch {
          errors.push({ source: "internet_archive", message: "Não foi possível acessar o Internet Archive agora." });
          return { query: q, results: [], errors };
        }
      }
      // Generic URL — quick HEAD probe
      try {
        const head = await fetch(q, { method: "HEAD" });
        const mime = head.headers.get("content-type") ?? "video/mp4";
        const name = decodeURIComponent(new URL(q).pathname.split("/").pop() ?? "video");
        return {
          query: q,
          results: [
            {
              source: "url" as const,
              key: `url:${q}`,
              externalId: q,
              title: name,
              playableUrl: q,
              mimeType: mime,
            },
          ] satisfies UnifiedResult[],
          errors,
        };
      } catch {
        errors.push({ source: "url", message: "Não foi possível acessar essa URL." });
        return { query: q, results: [], errors };
      }
    }

    // 2. Parallel search: Library + TMDB
    const [libraryRes, tmdbRes] = await Promise.allSettled([
      supabase
        .from("movies")
        .select("id,tmdb_id,title,release_year,poster_path,vote_average,overview")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .or(`title.ilike.%${q}%,original_title.ilike.%${q}%,overview.ilike.%${q}%`)
        .limit(20),
      (async () => {
        const { TmdbProvider } = await import("@/lib/tmdb.server");
        return TmdbProvider.search(q);
      })(),
    ]);

    const results: UnifiedResult[] = [];
    const libTmdbIds = new Set<number>();

    if (libraryRes.status === "fulfilled" && libraryRes.value.data) {
      for (const m of libraryRes.value.data) {
        if (m.tmdb_id) libTmdbIds.add(m.tmdb_id);
        results.push({
          source: "library",
          key: `library:${m.id}`,
          externalId: m.id,
          libraryMovieId: m.id,
          title: m.title,
          year: m.release_year ?? undefined,
          posterUrl: m.poster_path ?? undefined,
          overview: m.overview ?? undefined,
          rating: m.vote_average ?? undefined,
        });
      }
    } else if (libraryRes.status === "rejected") {
      errors.push({ source: "library", message: "Falha ao consultar a biblioteca." });
    }

    if (tmdbRes.status === "fulfilled") {
      for (const r of tmdbRes.value) {
        const tmdbId = Number(r.id);
        if (libTmdbIds.has(tmdbId)) continue; // already shown via library
        results.push({
          source: "tmdb",
          key: `tmdb:${r.id}`,
          externalId: r.id,
          title: r.title,
          year: r.year,
          posterUrl: r.posterUrl,
          overview: r.overview,
          rating: r.rating,
        });
      }
    } else {
      errors.push({ source: "tmdb", message: "TMDB indisponível no momento." });
    }

    return { query: q, results, errors };
  });
