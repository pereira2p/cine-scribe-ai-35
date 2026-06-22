import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MovieCardData {
  id: string;
  title: string;
  release_year?: number | null;
  poster_path?: string | null;
  vote_average?: number | null;
}

export function MovieCard({ movie, size = "md" }: { movie: MovieCardData; size?: "sm" | "md" | "lg" }) {
  const widths = { sm: "w-32", md: "w-44", lg: "w-56" }[size];
  return (
    <Link
      to="/movie/$movieId"
      params={{ movieId: movie.id }}
      className={cn("group relative shrink-0", widths)}
    >
      <motion.div
        whileHover={{ scale: 1.05, y: -4 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface shadow-card transition-cinematic group-hover:shadow-elevated"
      >
        {movie.poster_path ? (
          <img
            src={movie.poster_path}
            alt={movie.title}
            loading="lazy"
            className="h-full w-full object-cover transition-cinematic group-hover:brightness-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-surface text-xs text-muted-foreground">
            Sem poster
          </div>
        )}
        <div className="absolute inset-0 bg-poster-fade opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-cinematic group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
            {movie.vote_average != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 backdrop-blur">
                <Star className="h-3 w-3 fill-current text-chart-3" /> {movie.vote_average.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </motion.div>
      <div className="mt-2 px-0.5">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{movie.title}</p>
        {movie.release_year && <p className="text-xs text-muted-foreground">{movie.release_year}</p>}
      </div>
    </Link>
  );
}

export function MovieCardSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const widths = { sm: "w-32", md: "w-44", lg: "w-56" }[size];
  return (
    <div className={cn("shrink-0", widths)}>
      <div className="aspect-[2/3] animate-pulse rounded-xl bg-surface" />
      <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-surface" />
    </div>
  );
}