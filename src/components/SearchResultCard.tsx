import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Play, Plus, Star, Library, Sparkles, Archive, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UnifiedResult } from "@/lib/search/universal.functions";
import { tmdbImport } from "@/lib/tmdb.functions";
import { createMovieFromUrl } from "@/lib/imports.functions";
import { friendlyError } from "@/lib/errors";

const SOURCE_META = {
  library: { label: "Biblioteca", icon: Library, tone: "bg-primary/15 text-primary" },
  tmdb: { label: "TMDB", icon: Sparkles, tone: "bg-chart-2/15 text-chart-2" },
  internet_archive: { label: "Internet Archive", icon: Archive, tone: "bg-chart-3/15 text-chart-3" },
  url: { label: "Link direto", icon: LinkIcon, tone: "bg-muted text-foreground" },
} as const;

export function SearchResultCard({ result }: { result: UnifiedResult }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const importTmdb = useServerFn(tmdbImport);
  const importUrl = useServerFn(createMovieFromUrl);

  const adder = useMutation({
    mutationFn: async () => {
      if (result.source === "tmdb") {
        return importTmdb({ data: { tmdbId: Number(result.externalId) } });
      }
      if (result.source === "internet_archive" || result.source === "url") {
        if (!result.playableUrl) throw new Error("Arquivo não disponível para reprodução direta.");
        return importUrl({
          data: {
            title: result.title,
            url: result.playableUrl,
            mimeType: result.mimeType ?? "video/mp4",
            year: result.year,
            overview: result.overview,
            source: result.source === "internet_archive" ? "internet_archive" : "url",
          },
        });
      }
      throw new Error("Este filme já está na sua biblioteca.");
    },
    onSuccess: ({ movieId }) => {
      toast.success("Filme adicionado com sucesso", {
        action: {
          label: "Assistir",
          onClick: () => navigate({ to: "/watch/$movieId", params: { movieId } }),
        },
      });
      qc.invalidateQueries({ queryKey: ["movies"] });
      qc.invalidateQueries({ queryKey: ["universal-search"] });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const meta = SOURCE_META[result.source];
  const Icon = meta.icon;
  const inLibrary = result.source === "library";

  function onPrimary() {
    if (inLibrary && result.libraryMovieId) {
      navigate({ to: "/movie/$movieId", params: { movieId: result.libraryMovieId } });
      return;
    }
    adder.mutate();
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/70 shadow-card transition-all hover:border-primary/40 hover:shadow-elevated">
      <div className="relative aspect-[2/3] overflow-hidden bg-elevated">
        {result.posterUrl ? (
          <img src={result.posterUrl} alt={result.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Sem capa</div>
        )}
        <div className="absolute left-2 top-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium backdrop-blur ${meta.tone}`}>
            <Icon className="h-3 w-3" /> {meta.label}
          </span>
        </div>
        {result.rating != null && result.rating > 0 && (
          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 text-[10px] backdrop-blur">
            <Star className="h-3 w-3 fill-current text-chart-3" /> {result.rating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <p className="line-clamp-2 text-sm font-semibold leading-tight">{result.title}</p>
          {result.year && <p className="text-xs text-muted-foreground">{result.year}</p>}
        </div>
        {result.overview && (
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{result.overview}</p>
        )}
        <div className="mt-auto flex gap-2 pt-2">
          <Button
            size="sm"
            disabled={adder.isPending}
            onClick={onPrimary}
            className="flex-1 gap-1 bg-gradient-primary text-primary-foreground shadow-glow"
          >
            {adder.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : inLibrary ? (
              <Play className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {inLibrary ? "Abrir" : "Adicionar"}
          </Button>
          {!inLibrary && result.playableUrl && (
            <Badge variant="secondary" className="self-center text-[10px]">disponível</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
