import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { z } from "zod";
import { MovieCard, type MovieCardData } from "@/components/MovieCard";
import { db, type LocalMovie } from "@/lib/db/local";

const schema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: schema,
  component: SearchPage,
});

function toCard(m: LocalMovie): MovieCardData {
  return {
    id: String(m.tmdbId),
    title: m.title,
    release_year: m.releaseYear ?? null,
    poster_path: m.posterPath ?? null,
    vote_average: m.voteAverage ?? null,
  };
}

function SearchPage() {
  const { q } = Route.useSearch();
  const query = q.trim().toLowerCase();

  const all = useLiveQuery(async () => db.movies.toArray(), []);

  const results = useMemo(() => {
    if (!all) return null;
    if (!query) return all;
    return all.filter((m) => {
      const hay =
        `${m.title} ${m.originalTitle ?? ""} ${m.director ?? ""} ${(m.genres ?? []).join(" ")} ${(m.cast ?? []).map((c) => c.name).join(" ")}`.toLowerCase();
      return hay.includes(query);
    });
  }, [all, query]);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {query ? `Resultados para "${q}"` : "Pesquisar"}
        </h1>
        <p className="text-sm text-muted-foreground">{results?.length ?? 0} filmes</p>
      </header>
      {results && results.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
          {results.map((m) => <MovieCard key={m.tmdbId} movie={toCard(m)} />)}
        </div>
      ) : (
        <p className="text-muted-foreground">
          {query ? "Nenhum resultado na sua biblioteca." : "Digite algo para pesquisar."}
        </p>
      )}
    </div>
  );
}