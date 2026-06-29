import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { fetchTmdbDetail, tmdbImg } from "./tmdb-detail.server";
import { identifyTmdbId } from "./identify.server";
import { suggestSmartTags, applySmartTags } from "./tags.server";
import { cacheMovieAssets } from "./assets.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const EnrichInput = z.object({ movieId: z.string().uuid() });

export interface EnrichmentReport {
  movieId: string;
  identified: boolean;
  tmdbId: number | null;
  steps: Array<{ name: string; ok: boolean; detail?: string }>;
  status: "complete" | "partial" | "failed";
}

/**
 * Full enrichment pipeline. Never throws — each step is independent so a
 * single failure (e.g. no poster) does not block the others.
 */
export const enrichMovie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => EnrichInput.parse(i))
  .handler(async ({ data, context }): Promise<EnrichmentReport> => {
    const { supabase, userId } = context;
    return runEnrichment(supabase, userId, data.movieId);
  });

export async function runEnrichment(
  supabase: SupabaseClient<Database>,
  userId: string,
  movieId: string,
): Promise<EnrichmentReport> {
  const steps: EnrichmentReport["steps"] = [];
  const push = (name: string, ok: boolean, detail?: string) => steps.push({ name, ok, detail });

  const { data: movie, error: movieErr } = await supabase
    .from("movies")
    .select("id, title, tmdb_id, storage_key, storage_provider")
    .eq("id", movieId)
    .eq("user_id", userId)
    .maybeSingle();
  if (movieErr || !movie) {
    return { movieId, identified: false, tmdbId: null, steps: [{ name: "load", ok: false, detail: "Filme não encontrado" }], status: "failed" };
  }

  const job = await createJob(supabase, userId, movieId);

  // STEP 1 — Identify
  let tmdbId: number | null = movie.tmdb_id ?? null;
  if (!tmdbId) {
    try {
      const hint = movie.storage_key ?? movie.title;
      tmdbId = await identifyTmdbId(hint);
      push("identify", !!tmdbId, tmdbId ? `TMDB #${tmdbId}` : "Não foi possível identificar");
    } catch (e) {
      push("identify", false, errMsg(e));
    }
  } else {
    push("identify", true, `TMDB #${tmdbId}`);
  }

  if (!tmdbId) {
    await markFinal(supabase, movieId, "partial", "Identificação falhou — campos básicos preservados.");
    await finishJob(supabase, job, "partial", steps);
    return { movieId, identified: false, tmdbId: null, steps, status: "partial" };
  }

  // STEP 2 — TMDB detail
  let detail: Awaited<ReturnType<typeof fetchTmdbDetail>> | null = null;
  try {
    detail = await fetchTmdbDetail(tmdbId);
    push("tmdb-detail", true, detail.title);
  } catch (e) {
    push("tmdb-detail", false, errMsg(e));
  }

  if (detail) {
    // Pick the best logo (pt or en, fallback to first)
    const logo =
      detail.images?.logos?.find((l) => l.iso_639_1 === "pt") ??
      detail.images?.logos?.find((l) => l.iso_639_1 === "en") ??
      detail.images?.logos?.[0];

    const trailer =
      detail.videos?.results.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ??
      detail.videos?.results.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
      detail.videos?.results.find((v) => v.site === "YouTube");

    const certification =
      detail.release_dates?.results.find((r) => r.iso_3166_1 === "BR")?.release_dates.find((d) => d.certification)?.certification ??
      detail.release_dates?.results.find((r) => r.iso_3166_1 === "US")?.release_dates.find((d) => d.certification)?.certification ??
      null;

    try {
      await supabase
        .from("movies")
        .update({
          tmdb_id: detail.id,
          imdb_id: detail.imdb_id ?? null,
          title: detail.title,
          original_title: detail.original_title ?? null,
          overview: detail.overview ?? null,
          tagline: detail.tagline ?? null,
          release_date: detail.release_date ?? null,
          release_year: detail.release_date ? Number(detail.release_date.slice(0, 4)) : null,
          runtime_minutes: detail.runtime ?? null,
          original_language: detail.original_language ?? null,
          origin_country: detail.origin_country?.[0] ?? null,
          poster_path: tmdbImg(detail.poster_path, "w500") ?? null,
          backdrop_path: tmdbImg(detail.backdrop_path, "original") ?? null,
          logo_path: tmdbImg(logo?.file_path, "w500") ?? null,
          trailer_key: trailer?.key ?? null,
          vote_average: detail.vote_average ?? null,
          vote_count: detail.vote_count ?? null,
          popularity: detail.popularity ?? null,
          status: detail.status ?? null,
          budget: detail.budget ?? null,
          revenue: detail.revenue ?? null,
          certification,
          spoken_languages: detail.spoken_languages?.map((l) => l.english_name) ?? null,
          tmdb_keywords: detail.keywords?.keywords.map((k) => k.name) ?? null,
        })
        .eq("id", movieId)
        .eq("user_id", userId);
      push("metadata", true);
    } catch (e) {
      push("metadata", false, errMsg(e));
    }

    // Genres
    try {
      if (detail.genres.length) {
        await supabase.from("genres").upsert(detail.genres.map((g) => ({ id: g.id, name: g.name })), { onConflict: "id" });
        await supabase.from("movie_genres").delete().eq("movie_id", movieId);
        await supabase.from("movie_genres").insert(
          detail.genres.map((g) => ({ movie_id: movieId, genre_id: g.id, user_id: userId })),
        );
        push("genres", true, `${detail.genres.length}`);
      } else {
        push("genres", true, "0");
      }
    } catch (e) {
      push("genres", false, errMsg(e));
    }

    // STEP 3 — Credits (cast + director + writer + producer)
    try {
      const cast = (detail.credits?.cast ?? []).slice(0, 20);
      const crew = (detail.credits?.crew ?? []).filter((c) =>
        ["Director", "Writer", "Screenplay", "Producer", "Executive Producer"].includes(c.job),
      );
      const everyone = new Map<number, { id: number; name: string; profile_path: string | null }>();
      for (const p of [...cast, ...crew]) {
        everyone.set(p.id, { id: p.id, name: p.name, profile_path: p.profile_path ?? null });
      }
      if (everyone.size) {
        await supabase.from("people").upsert([...everyone.values()], { onConflict: "id" });
      }
      await supabase.from("movie_credits").delete().eq("movie_id", movieId);
      const credits = [
        ...cast.map((c) => ({
          movie_id: movieId, person_id: c.id, user_id: userId,
          role: "cast" as const, character_name: c.character ?? null,
          job: null as string | null, ord: c.order ?? null,
        })),
        ...crew.map((c) => ({
          movie_id: movieId, person_id: c.id, user_id: userId,
          role: jobToRole(c.job), character_name: null,
          job: c.job, ord: null,
        })),
      ];
      if (credits.length) await supabase.from("movie_credits").insert(credits);
      push("cast", true, `${cast.length} atores, ${crew.length} equipe`);
    } catch (e) {
      push("cast", false, errMsg(e));
    }

    // STEP 4 — Collection
    try {
      if (detail.belongs_to_collection) {
        const c = detail.belongs_to_collection;
        const { data: existing } = await supabase
          .from("collections")
          .select("id")
          .eq("user_id", userId)
          .eq("tmdb_collection_id", c.id)
          .maybeSingle();
        let colId = existing?.id;
        if (!colId) {
          const { data: created } = await supabase
            .from("collections")
            .insert({
              user_id: userId,
              tmdb_collection_id: c.id,
              name: c.name,
              is_smart: false,
              poster_path: tmdbImg(c.poster_path, "w500") ?? null,
              backdrop_path: tmdbImg(c.backdrop_path, "original") ?? null,
            })
            .select("id")
            .single();
          colId = created?.id;
        }
        if (colId) {
          await supabase.from("collection_movies").upsert(
            { collection_id: colId, movie_id: movieId, user_id: userId },
            { onConflict: "collection_id,movie_id" },
          );
        }
        push("collection", true, c.name);
      } else {
        push("collection", true, "—");
      }
    } catch (e) {
      push("collection", false, errMsg(e));
    }

    // STEP 5 — Cache assets
    try {
      const result = await cacheMovieAssets(supabase, userId, movieId, [
        ...(detail.poster_path ? [{ kind: "poster" as const, path: detail.poster_path, size: "w500" as const }] : []),
        ...(detail.backdrop_path ? [{ kind: "backdrop" as const, path: detail.backdrop_path, size: "original" as const }] : []),
        ...(logo ? [{ kind: "logo" as const, path: logo.file_path, size: "w500" as const }] : []),
      ]);
      push("assets", true, `${result.saved} salvos${result.cached ? `, ${result.cached} em cache` : ""}`);
    } catch (e) {
      push("assets", false, errMsg(e));
    }

    // STEP 6 — Smart tags
    try {
      const slugs = await suggestSmartTags({
        title: detail.title,
        overview: detail.overview,
        genres: detail.genres.map((g) => g.name),
        keywords: detail.keywords?.keywords.map((k) => k.name) ?? [],
        voteAverage: detail.vote_average,
      });
      const n = await applySmartTags(supabase, userId, movieId, slugs);
      push("tags", true, n ? slugs.join(", ") : "—");
    } catch (e) {
      push("tags", false, errMsg(e));
    }
  }

  // STEP 7 — Finalize
  const failed = steps.filter((s) => !s.ok).length;
  const status: "complete" | "partial" = failed === 0 ? "complete" : "partial";
  await markFinal(supabase, movieId, status, failed ? `${failed} etapas com aviso` : null);
  await supabase.from("activity_feed").insert({
    user_id: userId,
    kind: "movie_enriched",
    payload: { movie_id: movieId, tmdb_id: tmdbId, status, steps: steps.length },
  });
  await finishJob(supabase, job, status, steps);

  return { movieId, identified: true, tmdbId, steps, status };
}

function jobToRole(job: string): "director" | "writer" | "producer" | "cast" {
  if (job === "Director") return "director";
  if (job === "Writer" || job === "Screenplay") return "writer";
  if (job === "Producer" || job === "Executive Producer") return "producer";
  return "cast";
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
}

async function createJob(supabase: SupabaseClient<Database>, userId: string, movieId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("background_jobs")
      .insert({
        user_id: userId,
        type: "enrich_movie",
        status: "running",
        progress: 0,
        payload: { movie_id: movieId },
      })
      .select("id")
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

async function finishJob(
  supabase: SupabaseClient<Database>,
  jobId: string | null,
  status: "complete" | "partial" | "failed",
  steps: EnrichmentReport["steps"],
) {
  if (!jobId) return;
  try {
    await supabase
      .from("background_jobs")
      .update({
        status,
        progress: 100,
        finished_at: new Date().toISOString(),
        payload: { steps } as never,
      })
      .eq("id", jobId);
  } catch {
    // best-effort
  }
}

async function markFinal(
  supabase: SupabaseClient<Database>,
  movieId: string,
  status: "complete" | "partial" | "failed",
  note: string | null,
) {
  await supabase
    .from("movies")
    .update({
      enrichment_status: status,
      enrichment_error: note,
      enriched_at: new Date().toISOString(),
    })
    .eq("id", movieId);
}