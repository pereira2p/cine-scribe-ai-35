import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MovieCard, MovieCardSkeleton } from "@/components/MovieCard";
import { Input } from "@/components/ui/input";

const SearchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: SearchPage,
});

function SearchPage() {
  const { q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ ?? "");
  const [debounced, setDebounced] = useState(q);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(id);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["library-search", debounced],
    queryFn: async () => {
      if (!debounced) {
        const { data } = await supabase
          .from("movies")
          .select("id,title,release_year,poster_path,vote_average")
          .order("added_at", { ascending: false })
          .limit(48);
        return data ?? [];
      }
      const { data } = await supabase
        .from("movies")
        .select("id,title,release_year,poster_path,vote_average")
        .or(`title.ilike.%${debounced}%,original_title.ilike.%${debounced}%,overview.ilike.%${debounced}%`)
        .limit(60);
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold tracking-tight">Pesquisar</h1>
      <div className="relative mt-4 max-w-2xl">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busque por título, sinopse..."
          className="h-12 bg-surface pl-10 text-base"
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Linguagem natural (“filmes acima de nota 8”) chega na Fase 3 com o copiloto.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {isFetching && !data
          ? Array.from({ length: 14 }).map((_, i) => <MovieCardSkeleton key={i} />)
          : data?.map((m) => <MovieCard key={m.id} movie={m} />)}
      </div>
      {!isFetching && data?.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">Nenhum filme encontrado.</p>
      )}
    </div>
  );
}