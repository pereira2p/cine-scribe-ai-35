import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/downloads")({ component: Page });

function Page() {
  const { data } = useQuery({
    queryKey: ["downloads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("offline_downloads")
        .select("id, quality, status, bytes, total_bytes, movies(title,poster_path)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Download className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Downloads Offline</h1>
          <p className="text-sm text-muted-foreground">Assista sem internet</p>
        </div>
      </div>
      {(!data || data.length === 0) && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface/60 p-10 text-center">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Nenhum download ainda</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Baixe filmes em 480p, 720p, 1080p ou qualidade original direto na página do filme.
            Sincronização e progresso offline chegam em breve.
          </p>
        </div>
      )}
      <ul className="mt-6 space-y-2">
        {(data ?? []).map((d) => {
          const movie = d.movies as unknown as { title?: string; poster_path?: string | null };
          const pct = d.total_bytes ? Math.round((Number(d.bytes) / Number(d.total_bytes)) * 100) : 0;
          return (
            <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              {movie?.poster_path && <img src={movie.poster_path} className="h-16 w-12 rounded object-cover" alt="" />}
              <div className="flex-1">
                <p className="font-medium">{movie?.title ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{d.quality} · {d.status} · {pct}%</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}