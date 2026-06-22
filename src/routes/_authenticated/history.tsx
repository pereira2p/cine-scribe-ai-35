import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/history")({ component: Page });

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("watch_history")
        .select("id, watched_at, last_position_seconds, completed, device, movies(id,title,release_year,poster_path)")
        .order("watched_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tudo que você assistiu, com o último minuto exato.</p>
      <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-surface/60">
        {isLoading && <li className="p-6 text-sm text-muted-foreground">Carregando...</li>}
        {data?.length === 0 && !isLoading && (
          <li className="p-10 text-center text-sm text-muted-foreground">Nada por aqui ainda.</li>
        )}
        {data?.map((h) => {
          const m = h.movies as unknown as { id: string; title: string; release_year: number | null; poster_path: string | null } | null;
          if (!m) return null;
          return (
            <li key={h.id} className="flex items-center gap-3 p-3 hover:bg-elevated">
              <Link to="/movie/$movieId" params={{ movieId: m.id }} className="flex flex-1 items-center gap-3">
                {m.poster_path ? (
                  <img src={m.poster_path} alt="" className="h-16 w-11 rounded object-cover" />
                ) : (
                  <div className="h-16 w-11 rounded bg-elevated" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.title} {m.release_year && <span className="text-muted-foreground">({m.release_year})</span>}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.completed ? "Assistido" : `Parou em ${Math.floor(h.last_position_seconds / 60)}min`}
                    {" • "}
                    {formatDistanceToNow(new Date(h.watched_at), { addSuffix: true, locale: ptBR })}
                    {h.device && ` • ${h.device}`}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}