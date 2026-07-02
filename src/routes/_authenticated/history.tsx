import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type LocalMovie } from "@/lib/db/local";

export const Route = createFileRoute("/_authenticated/history")({ component: HistoryPage });

function HistoryPage() {
  const entries = useLiveQuery(async () => {
    const rows = await db.history.orderBy("watchedAt").reverse().limit(200).toArray();
    const movies = await Promise.all(rows.map((r) => db.movies.get(r.movieId)));
    return rows.map((r, i) => ({ ...r, movie: movies[i] as LocalMovie | undefined }));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground">{entries?.length ?? 0} visualizações</p>
      </header>
      {(!entries || entries.length === 0) ? (
        <p className="text-muted-foreground">Você ainda não assistiu nada.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface/60">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-4 p-3">
              {e.movie?.posterPath ? (
                <img src={e.movie.posterPath} alt="" className="h-16 w-11 shrink-0 rounded-md object-cover" />
              ) : (
                <div className="h-16 w-11 shrink-0 rounded-md bg-elevated" />
              )}
              <div className="min-w-0 flex-1">
                {e.movie ? (
                  <Link to="/movie/$movieId" params={{ movieId: String(e.movie.tmdbId) }} className="line-clamp-1 font-medium hover:text-primary">
                    {e.movie.title}
                  </Link>
                ) : (
                  <p className="line-clamp-1 font-medium text-muted-foreground">Filme removido</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(e.watchedAt).toLocaleString("pt-BR")}
                  {e.completed ? " · concluído" : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}