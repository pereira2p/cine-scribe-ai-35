import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MovieCard, MovieCardSkeleton, type MovieCardData } from "./MovieCard";
import { Button } from "@/components/ui/button";

export function MovieCarousel({
  title,
  subtitle,
  movies,
  loading,
  size = "md",
  emptyHint,
}: {
  title: string;
  subtitle?: string;
  movies: MovieCardData[];
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  emptyHint?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  };

  if (!loading && movies.length === 0 && !emptyHint) return null;

  return (
    <section className="group/section relative">
      <div className="mb-3 flex items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {movies.length > 4 && (
          <div className="hidden gap-1 opacity-0 transition-opacity group-hover/section:opacity-100 sm:flex">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollBy(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => scrollBy(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <div
        ref={ref}
        className="scrollbar-hide flex gap-3 overflow-x-auto scroll-smooth px-1 pb-4 pt-1 sm:gap-4"
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <MovieCardSkeleton key={i} size={size} />)
          : movies.map((m) => <MovieCard key={m.id} movie={m} size={size} />)}
        {!loading && movies.length === 0 && emptyHint && (
          <div className="flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            {emptyHint}
          </div>
        )}
      </div>
    </section>
  );
}