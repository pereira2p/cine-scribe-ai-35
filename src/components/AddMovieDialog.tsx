import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search as SearchIcon, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { tmdbSearch, tmdbImport } from "@/lib/tmdb.functions";

export function AddMovieDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const qc = useQueryClient();
  const search = useServerFn(tmdbSearch);
  const importFn = useServerFn(tmdbImport);

  // simple debounce
  if (typeof window !== "undefined") {
    setTimeout(() => setDebounced(q.trim()), 0);
  }

  const { data: results, isFetching } = useQuery({
    queryKey: ["tmdb-search", debounced],
    queryFn: () => search({ data: { query: debounced } }),
    enabled: debounced.length >= 2 && open,
    staleTime: 60_000,
  });

  const importer = useMutation({
    mutationFn: (tmdbId: number) => importFn({ data: { tmdbId } }),
    onSuccess: () => {
      toast.success("Filme adicionado \u00e0 biblioteca");
      qc.invalidateQueries({ queryKey: ["movies"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao importar"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4" /> Adicionar filme
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar \u00e0 sua biblioteca</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Busque por t\u00edtulo no TMDB..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setDebounced(e.target.value.trim());
            }}
            className="pl-9"
          />
        </div>
        <div className="-mx-2 max-h-[50vh] overflow-y-auto px-2">
          {isFetching && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
            </div>
          )}
          {!isFetching && debounced.length < 2 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Digite ao menos 2 caracteres</p>
          )}
          {!isFetching && results?.length === 0 && debounced.length >= 2 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum resultado</p>
          )}
          <ul className="grid gap-2">
            {results?.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={importer.isPending}
                  onClick={() => importer.mutate(Number(r.id))}
                  className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-cinematic hover:border-primary/40 hover:bg-elevated disabled:opacity-50"
                >
                  {r.posterUrl ? (
                    <img src={r.posterUrl} alt="" className="h-24 w-16 rounded-md object-cover" loading="lazy" />
                  ) : (
                    <div className="h-24 w-16 rounded-md bg-elevated" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.title}{r.year ? ` (${r.year})` : ""}</p>
                    {r.originalTitle && r.originalTitle !== r.title && (
                      <p className="truncate text-xs text-muted-foreground">{r.originalTitle}</p>
                    )}
                    {r.overview && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.overview}</p>}
                  </div>
                  <div className="shrink-0 pt-1">
                    {importer.isPending && importer.variables === Number(r.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}