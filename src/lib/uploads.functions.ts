import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { runEnrichment } from "./enrichment/pipeline.functions";

const MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

const CreateIntent = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
  mimeType: z.string().min(1).max(120),
  movieId: z.string().uuid().optional(),
});

export const createUploadIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateIntent.parse(i))
  .handler(async ({ data, context }) => {
    const { R2StorageProvider } = await import("./providers/r2.server");
    const handle = await R2StorageProvider.initUpload({
      filename: data.filename,
      size: data.size,
      mimeType: data.mimeType,
    });
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("uploads")
      .insert({
        user_id: userId,
        movie_id: data.movieId ?? null,
        filename: data.filename,
        size: data.size,
        mime_type: data.mimeType,
        storage_provider: "r2",
        storage_key: handle.storageKey,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return {
      uploadId: row.id,
      uploadUrl: handle.uploadUrl,
      storageKey: handle.storageKey,
      headers: handle.headers ?? {},
    };
  });

const Complete = z.object({
  uploadId: z.string().uuid(),
  movieId: z.string().uuid().optional(),
  durationSeconds: z.number().int().positive().optional(),
});

export const completeUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Complete.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: up, error: upErr } = await supabase
      .from("uploads")
      .select("id, storage_key, size, mime_type, movie_id")
      .eq("id", data.uploadId)
      .eq("user_id", userId)
      .single();
    if (upErr || !up) throw new Error("Upload não encontrado.");

    const movieId = data.movieId ?? up.movie_id;
    if (!movieId) {
      throw new Error("Vincule este upload a um filme antes de concluir.");
    }

    await supabase
      .from("uploads")
      .update({
        status: "completed",
        bytes_uploaded: up.size,
        movie_id: movieId,
      })
      .eq("id", up.id);

    await supabase
      .from("movies")
      .update({
        storage_provider: "r2",
        storage_key: up.storage_key,
        file_size: up.size,
        mime_type: up.mime_type,
        ...(data.durationSeconds ? { duration_seconds: data.durationSeconds } : {}),
      })
      .eq("id", movieId)
      .eq("user_id", userId);

    // Fire enrichment based on the filename / existing TMDB id.
    let report = null;
    try {
      report = await runEnrichment(supabase, userId, movieId);
    } catch {
      // best-effort
    }
    return { ok: true, movieId, report };
  });

const Abort = z.object({ uploadId: z.string().uuid(), reason: z.string().max(500).optional() });
export const abortUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Abort.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: up } = await supabase
      .from("uploads")
      .select("id, storage_key, status")
      .eq("id", data.uploadId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!up) return { ok: true };
    await supabase
      .from("uploads")
      .update({ status: "aborted", error_message: data.reason ?? null })
      .eq("id", up.id);
    if (up.status !== "completed") {
      try {
        const { R2StorageProvider } = await import("./providers/r2.server");
        await R2StorageProvider.delete(up.storage_key);
      } catch {
        // best-effort cleanup
      }
    }
    return { ok: true };
  });

const Stream = z.object({ movieId: z.string().uuid() });
export const getMovieStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Stream.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: movie, error } = await supabase
      .from("movies")
      .select("id, title, storage_key, storage_provider, mime_type, duration_seconds")
      .eq("id", data.movieId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !movie) throw new Error("Filme não encontrado.");
    if (!movie.storage_key) throw new Error("Este filme ainda não possui arquivo de vídeo.");
    // Direct-URL sources (Internet Archive, public URL) stream straight from origin.
    const provider = movie.storage_provider as string | null;
    if (provider === "internet_archive" || provider === "url") {
      return {
        url: movie.storage_key,
        mimeType: movie.mime_type ?? "video/mp4",
        expiresAt: null,
        title: movie.title,
        durationSeconds: movie.duration_seconds ?? null,
      };
    }
    const { R2StorageProvider } = await import("./providers/r2.server");
    const src = await R2StorageProvider.getStreamSource(movie.storage_key);
    return {
      url: src.url,
      mimeType: movie.mime_type ?? src.mimeType,
      expiresAt: src.expiresAt ?? null,
      title: movie.title,
      durationSeconds: movie.duration_seconds ?? null,
    };
  });

const Progress = z.object({
  movieId: z.string().uuid(),
  positionSeconds: z.number().int().nonnegative(),
  durationSeconds: z.number().int().positive().optional(),
  completed: z.boolean().optional(),
});

export const recordPlaybackProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Progress.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const completed =
      data.completed ??
      (data.durationSeconds ? data.positionSeconds / data.durationSeconds >= 0.9 : false);
    const { data: existing } = await supabase
      .from("watch_history")
      .select("id")
      .eq("user_id", userId)
      .eq("movie_id", data.movieId)
      .order("watched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("watch_history")
        .update({
          last_position_seconds: data.positionSeconds,
          duration_seconds: data.durationSeconds ?? null,
          completed,
          watched_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("watch_history").insert({
        user_id: userId,
        movie_id: data.movieId,
        last_position_seconds: data.positionSeconds,
        duration_seconds: data.durationSeconds ?? null,
        completed,
      });
    }
    return { ok: true, completed };
  });

export const getPlaybackProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Stream.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("watch_history")
      .select("last_position_seconds, duration_seconds, completed")
      .eq("user_id", userId)
      .eq("movie_id", data.movieId)
      .order("watched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return row ?? { last_position_seconds: 0, duration_seconds: null, completed: false };
  });