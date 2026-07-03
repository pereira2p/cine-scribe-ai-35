import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { RefreshCw, FolderOpen, HelpCircle, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MovieCard, MovieCardSkeleton, type MovieCardData } from "@/components/MovieCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db, type LocalMovie } from "@/lib/db/local";
import { useLibrary } from "@/lib/library/context";
import { identifyFile } from "@/lib/library/identify";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/library")({ component: LibraryPage });

type Order = "addedAt" | "title" | "releaseYear" | "voteAverage";

function toCard(m: LocalMovie): MovieCardData {
  return {
    id: String(m.tmdbId),
    title: m.title,
    release_year: m.releaseYear ?? null,
    poster_path: m.posterPath ?? null,
    vote_average: m.voteAverage ?? null,
  };
}

function LibraryPage() {
  const [order, setOrder] = useState<Order>("addedAt");
  const { hasRoot, chooseFolder, rescan, scanning, openPicker } = useLibrary();

  const movies = useLiveQuery(async () => {
    const table = db.movies.orderBy(order);
    const rows = order === "title" ? await table.toArray() : await table.reverse().toArray();
    return rows;
  }, [order]);

  const unidentified = useLiveQuery(async () => {
    const files = await db.files.orderBy("addedAt").reverse().toArray();
    return files.filter((f) => !f.movieId);
  }, []);

  const loading = movies === undefined;

  async function retryIdentify(path: string, name: string) {
    toast.info(`Buscando no TMDB: ${name}`);
    try {
      const res = await identifyFile(name);
      if (res.candidates.length === 0) {
        toast.error("Nenhum resultado no TMDB.");
        return;
      }
      const fileRec = await db.files.get(path);
      if (!fileRec) return;
      openPicker({
        file: {
          path,
          name: fileRec.name,
          size: fileRec.size,
          lastModified: fileRec.lastModified,
          handle: fileRec.handle as FileSystemFileHandle,
        },
        query: res.title,
        candidates: res.candidates,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na busca");
    }
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Biblioteca</h1>
          <p className="text-sm text-muted-foreground">{movies?.length ?? 0} filmes</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={order} onValueChange={(v) => setOrder(v as Order)}>
            <SelectTrigger className="w-44 bg-surface"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="addedAt">Mais recentes</SelectItem>
              <SelectItem value="title">Título (A-Z)</SelectItem>
              <SelectItem value="releaseYear">Ano (decrescente)</SelectItem>
              <SelectItem value="voteAverage">Melhor avaliados</SelectItem>
            </SelectContent>
          </Select>
          {hasRoot ? (
            <Button onClick={() => void rescan()} disabled={scanning} variant="secondary" className="gap-1.5">
              <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Escaneando" : "Escanear"}
            </Button>
          ) : (
            <Button onClick={() => void chooseFolder()} className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow">
              <FolderOpen className="h-4 w-4" />
              Escolher pasta
            </Button>
          )}
        </div>
      </header>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
        {loading
          ? Array.from({ length: 14 }).map((_, i) => <MovieCardSkeleton key={i} />)
          : movies!.map((m) => <MovieCard key={m.tmdbId} movie={toCard(m)} />)}
      </div>

      {unidentified && unidentified.length > 0 && (
        <section className="mt-12">
          <header className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">Ainda sem metadados</h2>
              <p className="text-xs text-muted-foreground">
                {unidentified.length} arquivo(s) encontrado(s) na pasta que não foram identificados no TMDB. Clique para escolher manualmente.
              </p>
            </div>
          </header>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {unidentified.map((f) => (
              <button
                key={f.path}
                onClick={() => void retryIdentify(f.path, f.name)}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3 text-left transition hover:bg-elevated"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-elevated">
                  <FileVideo className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{f.name}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{f.path}</p>
                </div>
                <HelpCircle className="h-4 w-4 shrink-0 text-primary" />
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && movies!.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-muted-foreground">
            {hasRoot ? "Sua biblioteca está vazia. Escaneie a pasta para começar." : "Escolha uma pasta para começar."}
          </p>
          {hasRoot ? (
            <Button onClick={() => void rescan()} disabled={scanning}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
              Escanear agora
            </Button>
          ) : (
            <Button onClick={() => void chooseFolder()}>
              <FolderOpen className="mr-1.5 h-4 w-4" />
              Escolher pasta
            </Button>
          )}
        </div>
      )}
    </div>
  );
}