import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { RefreshCw, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MovieCard, MovieCardSkeleton, type MovieCardData } from "@/components/MovieCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db, type LocalMovie } from "@/lib/db/local";
import { useLibrary } from "@/lib/library/context";

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
  const { hasRoot, chooseFolder, rescan, scanning } = useLibrary();

  const movies = useLiveQuery(async () => {
    const table = db.movies.orderBy(order);
    const rows = order === "title" ? await table.toArray() : await table.reverse().toArray();
    return rows;
  }, [order]);

  const loading = movies === undefined;

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