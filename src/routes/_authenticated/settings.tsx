import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { FolderOpen, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/local";
import { clearRoot, hasFsAccess } from "@/lib/library/fs";
import { useLibrary } from "@/lib/library/context";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { hasRoot, chooseFolder, rescan, scanning, needsPermission, grantPermission } = useLibrary();
  const counts = useLiveQuery(async () => ({
    movies: await db.movies.count(),
    files: await db.files.count(),
    favorites: await db.favorites.count(),
    history: await db.history.count(),
  }), []);

  async function clearLibrary() {
    if (!confirm("Isso vai apagar TODOS os dados locais (biblioteca, favoritos, histórico). Continuar?")) return;
    await Promise.all([
      db.movies.clear(),
      db.files.clear(),
      db.favorites.clear(),
      db.history.clear(),
      db.progress.clear(),
    ]);
    await clearRoot();
    toast.success("Biblioteca zerada.");
    location.reload();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          CineVault Portable · Fase 1 · Biblioteca local com identificação automática via TMDB
        </p>
      </header>

      {!hasFsAccess && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <div>
            Seu navegador não suporta a API de acesso a pastas locais. Use uma versão recente do Chrome, Edge, Brave ou Opera.
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface/60 p-5">
        <h2 className="text-lg font-semibold">Pasta da biblioteca</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aponte para uma pasta local com seus arquivos <code>.mp4</code>, <code>.mkv</code>, <code>.avi</code>, <code>.mov</code> ou <code>.webm</code>.
          Nada é enviado a servidores externos — apenas metadados públicos são buscados no TMDB.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void chooseFolder()} className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow">
            <FolderOpen className="h-4 w-4" />
            {hasRoot ? "Trocar pasta" : "Escolher pasta"}
          </Button>
          {hasRoot && (
            <Button variant="secondary" onClick={() => void rescan()} disabled={scanning} className="gap-1.5">
              <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Escaneando" : "Reescanear"}
            </Button>
          )}
          {needsPermission && (
            <Button variant="outline" onClick={() => void grantPermission()}>
              Conceder permissão
            </Button>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {(["movies", "files", "favorites", "history"] as const).map((k) => (
          <div key={k} className="rounded-2xl border border-border bg-surface/60 p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{k}</div>
            <div className="mt-1 text-3xl font-semibold">{counts?.[k] ?? 0}</div>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="text-lg font-semibold text-destructive">Zona de perigo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Apaga o cache local e a pasta memorizada. Seus arquivos originais não são tocados.
        </p>
        <Button variant="destructive" onClick={clearLibrary} className="mt-3 gap-1.5">
          <Trash2 className="h-4 w-4" /> Apagar biblioteca local
        </Button>
      </section>
    </div>
  );
}