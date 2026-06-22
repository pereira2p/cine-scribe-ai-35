import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MovieCard, MovieCardSkeleton } from "@/components/MovieCard";
import { AddMovieDialog } from "@/components/AddMovieDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/library")({ component: LibraryPage });

type Order = "added_at" | "title" | "release_year" | "vote_average";

function LibraryPage() {
  const [order, setOrder] = useState<Order>("added_at");
  const { data, isLoading } = useQuery({
    queryKey: ["library", order],
    queryFn: async () => {
      const { data } = await supabase
        .from("movies")
        .select("id,title,release_year,poster_path,vote_average")
        .eq("is_archived", false)
        .order(order, { ascending: order === "title" });
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Biblioteca</h1>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} filmes</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={order} onValueChange={(v) => setOrder(v as Order)}>
            <SelectTrigger className="w-44 bg-surface"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="added_at">Mais recentes</SelectItem>
              <SelectItem value="title">Título (A-Z)</SelectItem>
              <SelectItem value="release_year">Ano (decrescente)</SelectItem>
              <SelectItem value="vote_average">Melhor avaliados</SelectItem>
            </SelectContent>
          </Select>
          <AddMovieDialog />
        </div>
      </header>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
        {isLoading
          ? Array.from({ length: 14 }).map((_, i) => <MovieCardSkeleton key={i} />)
          : data?.map((m) => <MovieCard key={m.id} movie={m} />)}
      </div>
      {!isLoading && data?.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-muted-foreground">Sua biblioteca está vazia.</p>
          <AddMovieDialog />
        </div>
      )}
    </div>
  );
}