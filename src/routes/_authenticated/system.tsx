import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Check, X, Loader2, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Diagnostic server fn — returns status of each integration. */
const runDiagnostics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const checks: Array<Promise<{ name: string; ok: boolean; latencyMs: number; message: string }>> = [
      // Database
      (async () => {
        const start = Date.now();
        try {
          const { error } = await context.supabase.from("movies").select("id").limit(1);
          if (error) throw new Error(error.message);
          return { name: "Banco de dados", ok: true, latencyMs: Date.now() - start, message: "Conectado" };
        } catch (e) {
          return { name: "Banco de dados", ok: false, latencyMs: Date.now() - start, message: e instanceof Error ? e.message : "falha" };
        }
      })(),
      // TMDB
      (async () => {
        const start = Date.now();
        try {
          if (!process.env.TMDB_API_KEY) throw new Error("TMDB_API_KEY ausente");
          const r = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${process.env.TMDB_API_KEY}`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return { name: "TMDB", ok: true, latencyMs: Date.now() - start, message: "API ativa" };
        } catch (e) {
          return { name: "TMDB", ok: false, latencyMs: Date.now() - start, message: e instanceof Error ? e.message : "falha" };
        }
      })(),
      // Internet Archive
      (async () => {
        const start = Date.now();
        try {
          const r = await fetch("https://archive.org/metadata/BigBuckBunny_124", { method: "GET" });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return { name: "Internet Archive", ok: true, latencyMs: Date.now() - start, message: "Online" };
        } catch (e) {
          return { name: "Internet Archive", ok: false, latencyMs: Date.now() - start, message: e instanceof Error ? e.message : "falha" };
        }
      })(),
      // R2
      (async () => {
        const start = Date.now();
        const hasAll = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);
        return {
          name: "Storage R2",
          ok: hasAll,
          latencyMs: Date.now() - start,
          message: hasAll ? "Credenciais configuradas" : "Credenciais R2 incompletas",
        };
      })(),
      // Lovable AI
      (async () => {
        const start = Date.now();
        const ok = !!process.env.LOVABLE_API_KEY;
        return { name: "IA (Lovable AI)", ok, latencyMs: Date.now() - start, message: ok ? "Chave presente" : "Chave ausente" };
      })(),
    ];
    const results = await Promise.all(checks);
    return {
      results,
      comingSoon: ["Google Drive", "OneDrive", "Dropbox", "NAS", "Pasta sincronizada"],
    };
  });

export const Route = createFileRoute("/_authenticated/system")({ component: SystemPage });

function SystemPage() {
  const run = useServerFn(runDiagnostics);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["system-diagnostics"],
    queryFn: () => run(),
    staleTime: 30_000,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistema</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status das fontes e integrações do CineVault.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Testar novamente
        </Button>
      </div>

      <ul className="space-y-2">
        {data?.results.map((r) => (
          <li
            key={r.name}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/60 p-4"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  r.ok ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                }`}
              >
                {r.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </span>
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.message}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{r.latencyMs} ms</span>
          </li>
        ))}
        {!data && Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-16 animate-pulse rounded-2xl bg-surface/60" />
        ))}
      </ul>

      {data && data.comingSoon.length > 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-5">
          <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Clock className="h-3 w-3" /> Em desenvolvimento
          </p>
          <div className="flex flex-wrap gap-2">
            {data.comingSoon.map((s) => (
              <span key={s} className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
