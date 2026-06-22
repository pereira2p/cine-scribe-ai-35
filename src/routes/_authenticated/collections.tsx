import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/collections")({ component: Page });

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("collections")
        .select("id, name, description, collection_movies(movie_id, movies(poster_path))")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold tracking-tight">Coleções</h1>
      <p className="mt-1 text-sm text-muted-foreground">Franquias detectadas automaticamente ao importar filmes do TMDB.</p>
      {isLoading && <p className="mt-8 text-muted-foreground">Carregando...</p>}
      {!isLoading && data?.length === 0 && (
        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
          <Layers className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Adicione filmes de uma mesma franquia (ex: Harry Potter) — a coleção aparece aqui automaticamente.</p>
        </div>
      )}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => {
          const posters = (c.collection_movies as Array<{ movies: { poster_path: string | null } | null }> | null) ?? [];
          const visible = posters.slice(0, 4).map((p) => p.movies?.poster_path).filter(Boolean) as string[];
          return (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-border bg-surface/60 shadow-card transition-cinematic hover:shadow-elevated">
              <div className="grid h-44 grid-cols-2 grid-rows-2 gap-0.5 bg-elevated">
                {visible.map((p, i) => (
                  <img key={i} src={p} alt="" className="h-full w-full object-cover" />
                ))}
                {Array.from({ length: Math.max(0, 4 - visible.length) }).map((_, i) => (
                  <div key={i} className="bg-surface" />
                ))}
              </div>
              <div className="p-4">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{posters.length} filmes</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}