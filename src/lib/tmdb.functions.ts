import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
    const { TmdbProvider } = await import("./tmdb.server");
    const detail = await TmdbProvider.getDetail(String(data.tmdbId), { language: data.language });
    const { supabase, userId } = context;

    // Upsert people
    const everyone = [
      ...detail.cast.map((c) => ({ id: c.id, name: c.name, profile_path: c.profilePath ?? null })),
      ...detail.crew.map((c) => ({ id: c.id, name: c.name, profile_path: c.profilePath ?? null })),
    ];
    if (everyone.length) {
      // dedupe
      const seen = new Map<number, typeof everyone[number]>();
      for (const p of everyone) seen.set(p.id, p);
      await supabase.from("people").upsert([...seen.values()], { onConflict: "id" });
    }

    // Upsert movie
    const movieRow = {
      user_id: userId,
      tmdb_id: Number(detail.id),
      imdb_id: detail.imdbId ?? null,
      title: detail.title,
      original_title: detail.originalTitle ?? null,
      overview: detail.overview ?? null,
      tagline: detail.tagline ?? null,
      release_date: detail.releaseDate ?? null,
      release_year: detail.year ?? null,
      runtime_minutes: detail.runtimeMinutes ?? null,
      original_language: detail.originalLanguage ?? null,
      origin_country: detail.originCountry ?? null,
      poster_path: detail.posterUrl ?? null,
      backdrop_path: detail.backdropUrl ?? null,
      trailer_key: detail.trailerKey ?? null,
      vote_average: detail.rating ?? null,
      vote_count: detail.voteCount ?? null,
      popularity: detail.popularity ?? null,
      storage_provider: "tmdb_only" as const,
    };
    const { data: upserted, error } = await supabase
      .from("movies")
      .upsert(movieRow, { onConflict: "user_id,tmdb_id" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const movieId = upserted.id;

    // Genres link
    if (detail.genres.length) {
      await supabase
        .from("movie_genres")
        .delete()
        .eq("movie_id", movieId);
      await supabase.from("movie_genres").insert(
        detail.genres.map((g) => ({ movie_id: movieId, genre_id: g.id, user_id: userId })),
      );
    }

    // Credits link
    await supabase.from("movie_credits").delete().eq("movie_id", movieId);
    const credits = [
      ...detail.cast.map((c) => ({
        movie_id: movieId,
        person_id: c.id,
        user_id: userId,
        role: "cast" as const,
        character_name: c.character ?? null,
        job: null,
        ord: c.order ?? null,
      })),
      ...detail.crew
        .filter((c) => c.job === "Director")
        .map((c) => ({
          movie_id: movieId,
          person_id: c.id,
          user_id: userId,
          role: "director" as const,
          character_name: null,
          job: c.job,
          ord: null,
        })),
    ];
    if (credits.length) await supabase.from("movie_credits").insert(credits);

    // Collection
    if (detail.collectionId && detail.collectionName) {
      const { data: existing } = await supabase
        .from("collections")
        .select("id")
        .eq("user_id", userId)
        .eq("tmdb_collection_id", detail.collectionId)
        .maybeSingle();
      let colId = existing?.id;
      if (!colId) {
        const { data: created } = await supabase
          .from("collections")
          .insert({
            user_id: userId,
            tmdb_collection_id: detail.collectionId,
            name: detail.collectionName,
            is_smart: false,
          })
          .select("id")
          .single();
        colId = created?.id;
      }
      if (colId) {
        await supabase
          .from("collection_movies")
          .upsert({ collection_id: colId, movie_id: movieId, user_id: userId });
      }
    }

    return { movieId };
  });