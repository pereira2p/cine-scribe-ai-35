import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle, AlertTriangle, Info, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/local";
import { useLibrary } from "@/lib/library/context";
import { getStoredRoot } from "@/lib/library/fs";
import { tmdbSearchMovie } from "@/lib/tmdb/tmdb.functions";

export const Route = createFileRoute("/_authenticated/diagnostics")({ component: DiagnosticsPage });

type TmdbStatus = "checking" | "ok" | "fail";

function DiagnosticsPage() {
  const { logs, clearLogs, stats, scanning, rescan, hasRoot } = useLibrary();
  const totalFiles = useLiveQuery(async () => db.files.count(), []) ?? 0;
  const identified = useLiveQuery(async () => db.movies.count(), []) ?? 0;
  const filesWithoutMovie = useLiveQuery(async () => (await db.files.toArray()).filter((f) => !f.movieId).length, []) ?? 0;
  const [rootName, setRootName] = useState<string>("(não selecionada)");
  const [tmdb, setTmdb] = useState<TmdbStatus>("checking");
  const [tmdbMsg, setTmdbMsg] = useState<string>("");

  useEffect(() => {
    void (async () => {
      const h = await getStoredRoot();
      setRootName(h?.name ?? "(não selecionada)");
    })();
  }, [hasRoot]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await tmdbSearchMovie({ data: { query: "matrix" } });
        setTmdb(r.results.length > 0 ? "ok" : "fail");
        setTmdbMsg(r.results.length > 0 ? `${r.results.length} resultados de teste` : "Sem resultados no teste");
      } catch (e) {
        setTmdb("fail");
        setTmdbMsg(e instanceof Error ? e.message : "Erro desconhecido");
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Activity className="h-6 w-6 text-primary" /> Diagnóstico
          </h1>
          <p className="text-sm text-muted-foreground">Status do sistema e logs recentes do scanner.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void rescan()} disabled={scanning} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} /> Reescanear
          </Button>
          <Button variant="ghost" onClick={clearLogs} className="gap-1.5">
            <Trash2 className="h-4 w-4" /> Limpar logs
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Biblioteca selecionada" value={rootName} icon={hasRoot ? "ok" : "warn"} />
        <StatCard label="Arquivos encontrados" value={String(totalFiles)} icon="info" />
        <StatCard label="Filmes identificados" value={String(identified)} icon={identified > 0 ? "ok" : "info"} />
        <StatCard label="Sem metadados" value={String(filesWithoutMovie)} icon={filesWithoutMovie > 0 ? "warn" : "ok"} />
        <StatCard label="Erros (último scan)" value={String(stats.errors)} icon={stats.errors > 0 ? "fail" : "ok"} />
        <StatCard
          label="Último scan"
          value={stats.lastScanAt ? new Date(stats.lastScanAt).toLocaleString() : "—"}
          icon="info"
        />
        <StatCard label="Status TMDB" value={tmdb === "checking" ? "Verificando..." : tmdb === "ok" ? "OK" : "Falha"} sub={tmdbMsg} icon={tmdb === "ok" ? "ok" : tmdb === "fail" ? "fail" : "info"} />
        {stats.lastError && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 sm:col-span-2 lg:col-span-3">
            <p className="text-xs uppercase tracking-widest text-destructive">Último erro</p>
            <p className="mt-1 break-all text-sm text-destructive">{stats.lastError}</p>
          </div>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">Logs ({logs.length})</h2>
        <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-surface/60 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="p-4 text-muted-foreground">Sem logs. Execute um scan.</div>
          ) : (
            <ul>
              {logs.slice().reverse().map((l, i) => (
                <li key={i} className={`flex gap-3 border-b border-border/60 px-3 py-1.5 ${l.level === "error" ? "text-destructive" : l.level === "warn" ? "text-chart-3" : "text-foreground/90"}`}>
                  <span className="shrink-0 text-muted-foreground">{new Date(l.at).toLocaleTimeString()}</span>
                  <span className="shrink-0 uppercase">[{l.level}]</span>
                  <span className="break-all">{l.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: "ok" | "warn" | "fail" | "info" }) {
  const Icon = icon === "ok" ? CheckCircle2 : icon === "fail" ? XCircle : icon === "warn" ? AlertTriangle : Info;
  const color = icon === "ok" ? "text-primary" : icon === "fail" ? "text-destructive" : icon === "warn" ? "text-chart-3" : "text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Icon className={`h-4 w-4 ${color}`} /> {label}
      </div>
      <p className="mt-2 truncate text-lg font-semibold">{value}</p>
      {sub && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}