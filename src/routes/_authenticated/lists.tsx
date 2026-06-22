import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListChecks } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lists")({ component: Page });

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["watchlists"],
    queryFn: async () => {
      const { data } = await supabase
        .from("watchlists")
        .select("id, name, description, is_default, watchlist_movies(movie_id, movies(poster_path))")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold tracking-tight">Minhas listas</h1>
      <p className="mt-1 text-sm text-muted-foreground">Listas personalizadas, estilo “Sessão de sábado” ou “Top 10”.</p>
      {isLoading && <p className="mt-8 text-muted-foreground">Carregando...</p>}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((l) => {
          const items = (l.watchlist_movies as Array<{ movies: { poster_path: string | null } | null }> | null) ?? [];
          const visible = items.slice(0, 4).map((p) => p.movies?.poster_path).filter(Boolean) as string[];
          return (
            <div key={l.id} className="overflow-hidden rounded-2xl border border-border bg-surface/60 shadow-card">
              <div className="grid h-44 grid-cols-2 grid-rows-2 gap-0.5 bg-elevated">
                {visible.length === 0 && (
                  <div className="col-span-2 row-span-2 flex items-center justify-center">
                    <ListChecks className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {visible.map((p, i) => <img key={i} src={p} alt="" className="h-full w-full object-cover" />)}
              </div>
              <div className="p-4">
                <p className="font-semibold">{l.name}</p>
                <p className="text-xs text-muted-foreground">{items.length} filmes</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}