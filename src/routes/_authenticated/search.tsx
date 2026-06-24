import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Sparkles, Loader2 } from "lucide-react";
import { UniversalSearchBar } from "@/components/UniversalSearchBar";
import { SearchResultCard } from "@/components/SearchResultCard";
import { universalSearch } from "@/lib/search/universal.functions";
import { friendlyError } from "@/lib/errors";

const SearchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: (s) => SearchSchema.parse(s),
  component: SearchPage,
});

function SearchPage() {
  const { q: initialQ } = Route.useSearch();
  const [debounced, setDebounced] = useState(initialQ ?? "");
  useEffect(() => {
    const id = setTimeout(() => setDebounced((initialQ ?? "").trim()), 50);
    return () => clearTimeout(id);
  }, [initialQ]);

  const search = useServerFn(universalSearch);
  const { data, isFetching, error } = useQuery({
    queryKey: ["universal-search", debounced],
    queryFn: () => search({ data: { query: debounced } }),
    enabled: debounced.length >= 1,
    staleTime: 30_000,
    retry: false,
  });

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-8">
        <UniversalSearchBar />
      </div>

      {debounced && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Resultados para <span className="font-medium text-foreground">"{debounced}"</span>
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {friendlyError(error)}
        </p>
      )}

      {data && data.errors.length > 0 && (
        <ul className="mb-4 space-y-1 text-xs text-muted-foreground">
          {data.errors.map((e, i) => (
            <li key={i}>· {e.message}</li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {data?.results.map((r) => <SearchResultCard key={r.key} result={r} />)}
      </div>

      {!isFetching && data?.results.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Nenhum resultado encontrado. Tente outro termo ou cole um link.
        </p>
      )}
      {!debounced && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Comece digitando um título, diretor, gênero ou cole um link.
        </p>
      )}
    </div>
  );
}