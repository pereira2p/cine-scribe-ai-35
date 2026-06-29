import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { runEnrichment } from "./enrichment/pipeline.functions";

const SearchInput = z.object({ query: z.string().min(1).max(200), language: z.string().optional() });
const DetailInput = z.object({ tmdbId: z.number().int().positive(), language: z.string().optional() });

export const tmdbSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data }) => {
    const { TmdbProvider } = await import("./tmdb.server");
    return TmdbProvider.search(data.query, { language: data.language });
  });

export const tmdbImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DetailInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // 1. Ensure a movie row exists for this TMDB id.
    const { data: existing } = await supabase
      .from("movies")
      .select("id")
      .eq("user_id", userId)
      .eq("tmdb_id", data.tmdbId)
      .maybeSingle();
    let movieId = existing?.id;
    if (!movieId) {
      const { data: created, error } = await supabase
        .from("movies")
        .insert({
          user_id: userId,
          tmdb_id: data.tmdbId,
          title: `TMDB #${data.tmdbId}`,
          storage_provider: "tmdb_only",
          enrichment_status: "pending",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      movieId = created.id;
    }
    // 2. Run the unified enrichment pipeline.
    const report = await runEnrichment(supabase, userId, movieId);
    return { movieId, report };
  });