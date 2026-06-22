import { createFileRoute } from "@tanstack/react-router";
import { Upload, Cloud, HardDrive, FolderSearch } from "lucide-react";

export const Route = createFileRoute("/_authenticated/uploads")({ component: Page });

function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-dashed border-primary/40 bg-gradient-hero p-10 text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Upload className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Uploads chegam na Fase 2</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          A camada de storage já está abstraída (Cloudflare R2, Google Drive, OneDrive, NAS local).
          Por enquanto, adicione filmes pelo TMDB para construir o catálogo.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Cloud, label: "Cloudflare R2", desc: "Storage padrão escalável" },
            { icon: FolderSearch, label: "Google Drive / OneDrive", desc: "Sincronização da sua nuvem" },
            { icon: HardDrive, label: "NAS local", desc: "Servidor próprio em casa" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-surface/60 p-4 text-left">
              <s.icon className="mb-2 h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}