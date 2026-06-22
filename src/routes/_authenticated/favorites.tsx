import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MovieCard, MovieCardSkeleton, type MovieCardData } from "@/components/MovieCard";

export const Route = createFileRoute("/_authenticated/favorites")({ component: Page });

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["favorites-page"],
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("created_at, movies(id,title,release_year,poster_path,vote_average)")
        .order("created_at", { ascending: false });
      return (data ?? []).map((r) => r.movies as unknown as MovieCardData).filter(Boolean);
    },
  });
  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold tracking-tight">Favoritos</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data?.length ?? 0} filmes marcados com ❤</p>
      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => <MovieCardSkeleton key={i} />)
          : data?.map((m) => <MovieCard key={m.id} movie={m} />)}
      </div>
      {!isLoading && data?.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">Nenhum favorito ainda.</p>
      )}
    </div>
  );
}