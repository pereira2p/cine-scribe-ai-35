import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MovieCarousel } from "@/components/MovieCarousel";
import { UniversalSearchBar } from "@/components/UniversalSearchBar";
import type { MovieCardData } from "@/components/MovieCard";

export const Route = createFileRoute("/_authenticated/app")({
  component: Dashboard,
});

async function listMovies(order: "added_at" | "vote_average", limit = 20) {
  const { data } = await supabase
    .from("movies")
    .select("id,title,release_year,poster_path,backdrop_path,vote_average,added_at,overview")
    .eq("is_archived", false)
    .order(order, { ascending: false })
    .limit(limit);
  return (data ?? []) as (MovieCardData & { backdrop_path?: string | null; overview?: string | null; added_at?: string })[];
}

function Dashboard() {
  const { data: recent, isLoading } = useQuery({
    queryKey: ["movies", "recent"],
    queryFn: () => listMovies("added_at"),
  });
  const { data: continueWatching } = useQuery({
    queryKey: ["continue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("watch_history")
        .select("movie_id, last_position_seconds, watched_at, movies(id,title,release_year,poster_path,vote_average)")
        .eq("completed", false)
        .gt("last_position_seconds", 0)
        .order("watched_at", { ascending: false })
        .limit(20);
      return (data ?? []).map((r) => r.movies as unknown as MovieCardData).filter(Boolean);
    },
  });
  const { data: favorites } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("movies(id,title,release_year,poster_path,vote_average)")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []).map((r) => r.movies as unknown as MovieCardData).filter(Boolean);
    },
  });

  return (
    <div className="pb-20">
      <section className="relative isolate overflow-hidden px-4 pt-16 pb-10 sm:px-6 sm:pt-24 sm:pb-14">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--primary)/0.18),transparent_60%)]" />
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">CineVault</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            O que você quer assistir hoje?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Pesquise por título, diretor, gênero, cole um link ou descreva o que está procurando.
          </p>
        </div>
        <div className="mt-8">
          <UniversalSearchBar autoFocus />
        </div>
      </section>

      <div className="mx-auto max-w-[1800px] space-y-10 px-4 sm:px-6 lg:px-10">
        {(continueWatching?.length ?? 0) > 0 && (
          <MovieCarousel title="Continue assistindo" movies={continueWatching ?? []} />
        )}
        <MovieCarousel
          title="Recém adicionados"
          subtitle="O mais novo do seu cinema"
          movies={recent ?? []}
          loading={isLoading}
          emptyHint="Use a busca acima para adicionar seu primeiro filme"
        />
        {(favorites?.length ?? 0) > 0 && <MovieCarousel title="Favoritos" movies={favorites ?? []} />}
      </div>
    </div>
  );
}