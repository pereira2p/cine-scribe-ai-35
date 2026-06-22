import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Plus, Check, Play, Trash2, ChevronLeft, Star } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toggleFavorite, toggleWatchlist, markWatched, deleteMovie } from "@/lib/movies.functions";

export const Route = createFileRoute("/_authenticated/movie/$movieId")({
  component: MoviePage,
});

function MoviePage() {
  const { movieId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: movie, isLoading } = useQuery({
    queryKey: ["movie", movieId],
    queryFn: async () => {
      const { data } = await supabase
        .from("movies")
        .select("*, movie_genres(genres(name)), movie_credits(role, character_name, ord, people(id,name,profile_path))")
        .eq("id", movieId)
        .maybeSingle();
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: isFavorited } = useQuery({
    queryKey: ["fav", movieId],
    queryFn: async () => {
      const { count } = await supabase
        .from("favorites")
        .select("user_id", { head: true, count: "exact" })
        .eq("movie_id", movieId);
      return (count ?? 0) > 0;
    },
  });
  const { data: inList } = useQuery({
    queryKey: ["wl", movieId],
    queryFn: async () => {
      const { count } = await supabase
        .from("watchlist_movies")
        .select("movie_id", { head: true, count: "exact" })
        .eq("movie_id", movieId);
      return (count ?? 0) > 0;
    },
  });

  const favFn = useServerFn(toggleFavorite);
  const wlFn = useServerFn(toggleWatchlist);
  const watchedFn = useServerFn(markWatched);
  const deleteFn = useServerFn(deleteMovie);

  const favMut = useMutation({
    mutationFn: () => favFn({ data: { movieId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fav", movieId] }),
  });
  const wlMut = useMutation({
    mutationFn: () => wlFn({ data: { movieId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wl", movieId] }),
  });
  const watchedMut = useMutation({
    mutationFn: () => watchedFn({ data: { movieId, watched: true } }),
    onSuccess: () => toast.success("Marcado como assistido"),
  });
  const delMut = useMutation({
    mutationFn: () => deleteFn({ data: { movieId } }),
    onSuccess: () => {
      toast.success("Filme removido");
      qc.invalidateQueries({ queryKey: ["movies"] });
      navigate({ to: "/library" });
    },
  });

  if (isLoading) return <div className="p-10 text-muted-foreground">Carregando...</div>;
  if (!movie) return <div className="p-10 text-muted-foreground">Filme não encontrado.</div>;

  const directors = (movie.movie_credits ?? []).filter((c: { role: string }) => c.role === "director");
  const cast = (movie.movie_credits ?? [])
    .filter((c: { role: string }) => c.role === "cast")
    .sort((a: { ord: number | null }, b: { ord: number | null }) => (a.ord ?? 99) - (b.ord ?? 99));
  const genres = (movie.movie_genres ?? []).map((g: { genres: { name: string } | null }) => g.genres?.name).filter(Boolean);

  return (
    <div className="pb-16">
      <section className="relative h-[70vh] min-h-[480px] w-full overflow-hidden">
        {movie.backdrop_path && (
          <img src={movie.backdrop_path} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-backdrop-fade" />
        <div className="absolute inset-0 bg-backdrop-bottom" />
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/library" })} className="absolute left-4 top-4 z-10 gap-1 bg-background/40 backdrop-blur">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="relative z-10 mx-auto flex h-full max-w-6xl items-end gap-6 px-4 pb-12 sm:px-8">
          {movie.poster_path && (
            <motion.img
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              src={movie.poster_path}
              alt={movie.title}
              className="hidden h-72 rounded-xl shadow-elevated md:block"
            />
          )}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 flex-1">
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">{movie.title}</h1>
            {movie.tagline && <p className="mt-1 italic text-muted-foreground">{movie.tagline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {movie.release_year && <span>{movie.release_year}</span>}
              {movie.runtime_minutes && <span>{Math.floor(movie.runtime_minutes / 60)}h {movie.runtime_minutes % 60}m</span>}
              {movie.vote_average != null && (
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Star className="h-3.5 w-3.5 fill-current text-chart-3" /> {Number(movie.vote_average).toFixed(1)}
                </span>
              )}
              {genres.length > 0 && <span>{genres.join(" • ")}</span>}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <PlayDialog title={movie.title}>
                <Button size="lg" className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow">
                  <Play className="h-4 w-4 fill-current" /> Assistir
                </Button>
              </PlayDialog>
              <Button variant="secondary" onClick={() => favMut.mutate()} className="gap-2">
                <Heart className={"h-4 w-4 " + (isFavorited ? "fill-current text-primary" : "")} />
                {isFavorited ? "Favorito" : "Favoritar"}
              </Button>
              <Button variant="secondary" onClick={() => wlMut.mutate()} className="gap-2">
                {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {inList ? "Na lista" : "Minha lista"}
              </Button>
              <Button variant="secondary" onClick={() => watchedMut.mutate()} className="gap-2">
                <Check className="h-4 w-4" /> Já assisti
              </Button>
              <Button variant="ghost" onClick={() => delMut.mutate()} className="gap-2 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 pt-10 sm:px-8">
        {movie.overview && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">Sinopse</h2>
            <p className="max-w-3xl text-muted-foreground">{movie.overview}</p>
          </section>
        )}
        {directors.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">Direção</h2>
            <p className="text-muted-foreground">
              {directors.map((d: { people: { name: string } | null }) => d.people?.name).filter(Boolean).join(", ")}
            </p>
          </section>
        )}
        {cast.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Elenco</h2>
            <div className="scrollbar-hide flex gap-3 overflow-x-auto">
              {cast.slice(0, 12).map((c: { people: { id: number; name: string; profile_path: string | null } | null; character_name: string | null }) => (
                <div key={c.people?.id} className="w-28 shrink-0 text-center">
                  <div className="aspect-[2/3] overflow-hidden rounded-lg bg-surface">
                    {c.people?.profile_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${c.people.profile_path}`}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs font-medium">{c.people?.name}</p>
                  {c.character_name && <p className="line-clamp-1 text-[10px] text-muted-foreground">{c.character_name}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {movie.trailer_key && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Trailer</h2>
            <div className="aspect-video max-w-3xl overflow-hidden rounded-xl border border-border bg-black shadow-card">
              <iframe
                src={`https://www.youtube.com/embed/${movie.trailer_key}`}
                title="Trailer"
                className="h-full w-full"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function PlayDialog({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Player chega na Fase 2</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">{title}</strong> ainda não tem arquivo de vídeo associado.
          </p>
          <p>
            Na <strong className="text-foreground">Fase 2</strong> você vai poder fazer upload direto para o
            Cloudflare R2 e reproduzir aqui mesmo, com legendas, qualidade adaptativa e progresso sincronizado.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}