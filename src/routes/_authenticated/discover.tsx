import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MovieCard, MovieCardSkeleton, type MovieCardData } from "@/components/MovieCard";

export const Route = createFileRoute("/_authenticated/discover")({ component: Page });

function pickDaily<T>(arr: T[]): T | undefined {
  if (!arr.length) return;
  const day = Math.floor(Date.now() / 86_400_000);
  return arr[day % arr.length];
}

function Page() {
  const { data: all, isLoading } = useQuery({
    queryKey: ["all-movies"],
    queryFn: async () => {
      const { data } = await supabase.from("movies").select("id,title,release_year,poster_path,backdrop_path,vote_average,overview");
      return (data ?? []) as Array<MovieCardData & { backdrop_path?: string | null; overview?: string | null }>;
    },
  });

  const featured = pickDaily(all ?? []);
  const top = [...(all ?? [])].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0)).slice(0, 12);
  const random = [...(all ?? [])].sort(() => Math.random() - 0.5).slice(0, 12);

  return (
    <div className="pb-16">
      <section className="relative h-[50vh] min-h-[360px] overflow-hidden">
        {featured?.backdrop_path && <img src={featured.backdrop_path} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-backdrop-fade" />
        <div className="absolute inset-0 bg-backdrop-bottom" />
        <div className="relative z-10 flex h-full max-w-2xl flex-col justify-end px-6 pb-12">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" /> Filme do dia
          </div>
          <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            {featured?.title ?? "Hoje para Você"}
          </h1>
          {featured?.overview && <p className="mt-3 line-clamp-3 max-w-xl text-sm text-muted-foreground">{featured.overview}</p>}
        </div>
      </section>
      <div className="mx-auto max-w-[1800px] space-y-10 px-4 pt-8 sm:px-6 lg:px-10">
        <div>
          <h2 className="mb-3 text-xl font-semibold sm:text-2xl">Top da sua biblioteca</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
            {isLoading ? Array.from({ length: 8 }).map((_, i) => <MovieCardSkeleton key={i} />) : top.map((m) => <MovieCard key={m.id} movie={m} />)}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-xl font-semibold sm:text-2xl">Aleatórios para inspirar</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
            {random.map((m) => <MovieCard key={m.id} movie={m} />)}
          </div>
        </div>
      </div>
    </div>
  );
}