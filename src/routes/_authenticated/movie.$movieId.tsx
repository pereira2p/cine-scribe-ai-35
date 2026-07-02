import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Play, Trash2, ChevronLeft, Star, FileVideo } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/local";

export const Route = createFileRoute("/_authenticated/movie/$movieId")({
  component: MoviePage,
});

function MoviePage() {
  const { movieId } = Route.useParams();
  const tmdbId = Number(movieId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const movie = useLiveQuery(async () => db.movies.get(tmdbId), [tmdbId]);
  const file = useLiveQuery(async () => {
    if (!movie?.filePath) return undefined;
    return db.files.get(movie.filePath);
  }, [movie?.filePath]);
  const isFav = useLiveQuery(async () => (await db.favorites.get(tmdbId)) != null, [tmdbId]);

  const toggleFav = useMutation({
    mutationFn: async () => {
      const cur = await db.favorites.get(tmdbId);
      if (cur) await db.favorites.delete(tmdbId);
      else await db.favorites.add({ movieId: tmdbId, createdAt: Date.now() });
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (movie?.filePath) await db.files.update(movie.filePath, { movieId: undefined });
      await db.movies.delete(tmdbId);
      await db.favorites.delete(tmdbId);
      await db.progress.delete(tmdbId);
    },
    onSuccess: () => {
      toast.success("Removido da biblioteca (o arquivo original não foi apagado).");
      navigate({ to: "/library" });
    },
  });

  if (movie === undefined) return <div className="p-10 text-muted-foreground">Carregando...</div>;
  if (movie === null) throw notFound();

  const hasFile = Boolean(file?.handle);

  return (
    <div className="pb-16">
      <section className="relative h-[70vh] min-h-[480px] w-full overflow-hidden">
        {movie.backdropPath && (
          <img src={movie.backdropPath} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-backdrop-fade" />
        <div className="absolute inset-0 bg-backdrop-bottom" />
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/library" })} className="absolute left-4 top-4 z-10 gap-1 bg-background/40 backdrop-blur">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-6 pb-10">
          <div className="flex flex-wrap items-end gap-6">
            {movie.posterPath && (
              <img src={movie.posterPath} alt="" className="hidden h-56 w-40 rounded-xl shadow-elevated sm:block" />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{movie.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {movie.releaseYear && <span>{movie.releaseYear}</span>}
                {movie.runtime && <span>· {movie.runtime} min</span>}
                {movie.voteAverage != null && (
                  <span className="inline-flex items-center gap-1">
                    · <Star className="h-3.5 w-3.5 fill-current text-chart-3" /> {movie.voteAverage.toFixed(1)}
                  </span>
                )}
                {movie.director && <span>· dir. {movie.director}</span>}
              </div>
              {movie.genres && movie.genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {movie.genres.map((g) => (
                    <span key={g} className="rounded-full border border-border bg-surface/70 px-2 py-0.5 text-xs">{g}</span>
                  ))}
                </div>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  disabled={!hasFile}
                  onClick={() => navigate({ to: "/watch/$movieId", params: { movieId } })}
                  className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow"
                >
                  <Play className="h-4 w-4 fill-current" /> Assistir
                </Button>
                <Button variant="secondary" onClick={() => toggleFav.mutate()} className="gap-1.5">
                  <Heart className={`h-4 w-4 ${isFav ? "fill-current text-primary" : ""}`} />
                  {isFav ? "Favorito" : "Favoritar"}
                </Button>
                <Button variant="ghost" onClick={() => remove.mutate()} className="gap-1.5 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" /> Remover
                </Button>
              </div>
              {!hasFile && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/70 px-2 py-1 text-xs text-muted-foreground">
                  <FileVideo className="h-3.5 w-3.5" />
                  Arquivo local não encontrado — reescaneie a pasta.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pt-8">
        {movie.overview && <p className="max-w-3xl text-base leading-relaxed text-foreground/90">{movie.overview}</p>}

        {movie.cast && movie.cast.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 text-lg font-semibold">Elenco</h2>
            <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
              {movie.cast.map((c) => (
                <div key={`${c.name}-${c.character ?? ""}`} className="w-28 shrink-0">
                  <div className="aspect-[2/3] overflow-hidden rounded-xl bg-surface">
                    {c.profile ? (
                      <img src={`https://image.tmdb.org/t/p/w342${c.profile}`} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Sem foto</div>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <p className="line-clamp-1 text-xs font-medium">{c.name}</p>
                    {c.character && <p className="line-clamp-1 text-[11px] text-muted-foreground">{c.character}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {movie.trailerKey && (
          <div className="mt-10">
            <h2 className="mb-3 text-lg font-semibold">Trailer</h2>
            <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border">
              <iframe
                src={`https://www.youtube.com/embed/${movie.trailerKey}`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
                title="Trailer"
              />
            </div>
          </div>
        )}

        {file && (
          <p className="mt-10 truncate text-xs text-muted-foreground">Arquivo: {file.path}</p>
        )}
      </section>
    </div>
  );
}