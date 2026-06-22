import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ToggleFavorite = z.object({ movieId: z.string().uuid() });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ToggleFavorite.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("favorites")
      .select("user_id")
      .eq("user_id", userId)
      .eq("movie_id", data.movieId)
      .is("viewer_profile_id", null)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("movie_id", data.movieId)
        .is("viewer_profile_id", null);
      return { favorited: false };
    }
    await supabase.from("favorites").insert({ user_id: userId, movie_id: data.movieId });
    return { favorited: true };
  });

const ToggleWatchlist = z.object({ movieId: z.string().uuid(), watchlistId: z.string().uuid().optional() });

export const toggleWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ToggleWatchlist.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let wlId = data.watchlistId;
    if (!wlId) {
      const { data: def } = await supabase
        .from("watchlists")
        .select("id")
        .eq("user_id", userId)
        .eq("is_default", true)
        .maybeSingle();
      wlId = def?.id;
    }
    if (!wlId) {
      const { data: created } = await supabase
        .from("watchlists")
        .insert({ user_id: userId, name: "Minha Lista", is_default: true })
        .select("id")
        .single();
      wlId = created!.id;
    }
    const { data: existing } = await supabase
      .from("watchlist_movies")
      .select("movie_id")
      .eq("watchlist_id", wlId)
      .eq("movie_id", data.movieId)
      .maybeSingle();
    if (existing) {
      await supabase.from("watchlist_movies").delete().eq("watchlist_id", wlId).eq("movie_id", data.movieId);
      return { inList: false };
    }
    await supabase
      .from("watchlist_movies")
      .insert({ watchlist_id: wlId, movie_id: data.movieId, user_id: userId });
    return { inList: true };
  });

const MarkWatched = z.object({ movieId: z.string().uuid(), watched: z.boolean() });
export const markWatched = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => MarkWatched.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.watched) {
      await supabase
        .from("watch_history")
        .insert({ user_id: userId, movie_id: data.movieId, completed: true, last_position_seconds: 0 });
    } else {
      await supabase.from("watch_history").delete().eq("user_id", userId).eq("movie_id", data.movieId).eq("completed", true);
    }
    return { ok: true };
  });

const DeleteMovie = z.object({ movieId: z.string().uuid() });
export const deleteMovie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => DeleteMovie.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("movies").delete().eq("id", data.movieId).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });