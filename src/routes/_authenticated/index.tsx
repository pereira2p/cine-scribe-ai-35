import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { FolderOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MovieCarousel } from "@/components/MovieCarousel";
import { UniversalSearchBar } from "@/components/UniversalSearchBar";
import { db, type LocalMovie } from "@/lib/db/local";
import { useLibrary } from "@/lib/library/context";
import type { MovieCardData } from "@/components/MovieCard";

export const Route = createFileRoute("/_authenticated/")({ component: Home });

function toCard(m: LocalMovie): MovieCardData {
  return {
    id: String(m.tmdbId),
    title: m.title,
    release_year: m.releaseYear ?? null,
    poster_path: m.posterPath ?? null,
    vote_average: m.voteAverage ?? null,
  };
}

function Home() {
  const { hasRoot, chooseFolder, rescan, scanning } = useLibrary();

  const recent = useLiveQuery(async () => {
    return (await db.movies.orderBy("addedAt").reverse().limit(20).toArray()).map(toCard);
  }, []);

  const topRated = useLiveQuery(async () => {
    return (await db.movies.orderBy("voteAverage").reverse().limit(20).toArray()).map(toCard);
  }, []);

  const continueWatching = useLiveQuery(async () => {
    const items = await db.progress
      .orderBy("updatedAt")
      .reverse()
      .filter((p) => !p.completed && p.position > 5)
      .limit(20)
      .toArray();
    const movies = await Promise.all(items.map((p) => db.movies.get(p.movieId)));
    return movies.filter(Boolean).map((m) => toCard(m as LocalMovie));
  }, []);

  const favorites = useLiveQuery(async () => {
    const favs = await db.favorites.orderBy("createdAt").reverse().limit(20).toArray();
    const movies = await Promise.all(favs.map((f) => db.movies.get(f.movieId)));
    return movies.filter(Boolean).map((m) => toCard(m as LocalMovie));
  }, []);

  const empty = (recent?.length ?? 0) === 0;

  return (
    <div className="pb-20">
      <section className="relative isolate overflow-hidden px-4 pt-16 pb-10 sm:px-6 sm:pt-24 sm:pb-14">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--primary)/0.18),transparent_60%)]" />
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">CineVault Portable</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Sua biblioteca de filmes, organizada sozinha.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Escolha uma pasta local. O CineVault escaneia, identifica e enriquece cada filme com dados do TMDB.
          </p>
        </div>
        <div className="mt-8">
          <UniversalSearchBar autoFocus={!empty} />
        </div>
        {empty && (
          <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-border bg-surface/70 p-8 text-center shadow-elevated backdrop-blur-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <FolderOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Comece pela sua pasta de filmes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aponte para o diretório onde ficam seus arquivos <code>.mp4</code>, <code>.mkv</code>,{" "}
              <code>.avi</code>, <code>.mov</code> ou <code>.webm</code>. Nada é enviado a nenhum servidor.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {hasRoot ? (
                <Button onClick={() => void rescan()} disabled={scanning} className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow">
                  <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
                  Escanear agora
                </Button>
              ) : (
                <Button onClick={() => void chooseFolder()} className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow">
                  <FolderOpen className="h-4 w-4" />
                  Escolher pasta
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link to="/settings">Configurações</Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      {!empty && (
        <div className="mx-auto max-w-[1800px] space-y-10 px-4 sm:px-6 lg:px-10">
          {(continueWatching?.length ?? 0) > 0 && (
            <MovieCarousel title="Continue assistindo" movies={continueWatching ?? []} />
          )}
          <MovieCarousel title="Recém adicionados" subtitle="O mais novo da sua biblioteca" movies={recent ?? []} />
          {(topRated?.length ?? 0) > 0 && (
            <MovieCarousel title="Melhores avaliados" movies={topRated ?? []} />
          )}
          {(favorites?.length ?? 0) > 0 && <MovieCarousel title="Favoritos" movies={favorites ?? []} />}
        </div>
      )}
    </div>
  );
}