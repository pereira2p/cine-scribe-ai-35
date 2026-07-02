import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { MovieCard, type MovieCardData } from "@/components/MovieCard";
import { db, type LocalMovie } from "@/lib/db/local";

export const Route = createFileRoute("/_authenticated/favorites")({ component: FavoritesPage });

function toCard(m: LocalMovie): MovieCardData {
  return {
    id: String(m.tmdbId),
    title: m.title,
    release_year: m.releaseYear ?? null,
    poster_path: m.posterPath ?? null,
    vote_average: m.voteAverage ?? null,
  };
}

function FavoritesPage() {
  const movies = useLiveQuery(async () => {
    const favs = await db.favorites.orderBy("createdAt").reverse().toArray();
    const rows = await Promise.all(favs.map((f) => db.movies.get(f.movieId)));
    return rows.filter(Boolean) as LocalMovie[];
  }, []);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Favoritos</h1>
        <p className="text-sm text-muted-foreground">{movies?.length ?? 0} filmes</p>
      </header>
      {(!movies || movies.length === 0) ? (
        <p className="text-muted-foreground">Nenhum favorito ainda.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
          {movies.map((m) => <MovieCard key={m.tmdbId} movie={toCard(m)} />)}
        </div>
      )}
    </div>
  );
}