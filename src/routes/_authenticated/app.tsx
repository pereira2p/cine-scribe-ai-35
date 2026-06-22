import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MovieCarousel } from "@/components/MovieCarousel";
import { AddMovieDialog } from "@/components/AddMovieDialog";
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
  const { data: topRated } = useQuery({
    queryKey: ["movies", "top-rated"],
    queryFn: () => listMovies("vote_average"),
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

  const featured = recent?.[0];

  return (
    <div className="pb-16">
      {featured ? <FeaturedHero movie={featured} /> : <EmptyHero hasAnyMovie={!isLoading && (recent?.length ?? 0) === 0} />}
      <div className="mx-auto max-w-[1800px] space-y-10 px-4 pt-8 sm:px-6 lg:px-10">
        <MovieCarousel
          title="Continue assistindo"
          movies={continueWatching ?? []}
          loading={!continueWatching}
        />
        <MovieCarousel
          title="Recém adicionados"
          subtitle="O mais novo do seu cinema"
          movies={recent ?? []}
          loading={isLoading}
          emptyHint="Adicione seu primeiro filme para começar"
        />
        <MovieCarousel
          title="Melhores avaliados"
          subtitle="Top da sua biblioteca"
          movies={topRated ?? []}
        />
        <MovieCarousel
          title="Favoritos"
          movies={favorites ?? []}
        />
      </div>
    </div>
  );
}

function FeaturedHero({ movie }: { movie: MovieCardData & { backdrop_path?: string | null; overview?: string | null } }) {
  return (
    <section className="relative h-[68vh] min-h-[460px] w-full overflow-hidden">
      {movie.backdrop_path && (
        <img src={movie.backdrop_path} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-backdrop-fade" />
      <div className="absolute inset-0 bg-backdrop-bottom" />
      <div className="relative z-10 flex h-full max-w-2xl flex-col justify-end gap-4 px-4 pb-16 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" /> Em destaque na sua biblioteca
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">{movie.title}</h1>
          {movie.overview && (
            <p className="mt-3 line-clamp-3 max-w-xl text-sm text-muted-foreground sm:text-base">{movie.overview}</p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function EmptyHero({ hasAnyMovie }: { hasAnyMovie: boolean }) {
  return (
    <section className="relative flex h-[60vh] min-h-[420px] w-full items-center justify-center overflow-hidden bg-gradient-hero">
      <div className="relative z-10 mx-auto max-w-xl px-6 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Plus className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Sua biblioteca está esperando.</h1>
        <p className="mt-3 text-muted-foreground">
          {hasAnyMovie
            ? "Adicione seu primeiro filme — a IA cuida da capa, elenco e organização."
            : "Carregando..."}
        </p>
        <div className="mt-6 flex justify-center">
          <AddMovieDialog />
        </div>
      </div>
    </section>
  );
}