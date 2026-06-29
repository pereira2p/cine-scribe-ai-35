import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Link as LinkIcon, Film, Cloud, Clock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddMovieDialog } from "@/components/AddMovieDialog";
import { UploadDropzone } from "@/components/UploadDropzone";
import { archiveAnalyze, urlAnalyze, createMovieFromUrl } from "@/lib/imports.functions";
import { friendlyError } from "@/lib/errors";
import { ImportProgressStepper, type EnrichmentStep } from "@/components/ImportProgressStepper";

export function UniversalImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar filme</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="tmdb">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tmdb"><Film className="mr-1 h-3.5 w-3.5" />TMDB</TabsTrigger>
            <TabsTrigger value="link"><LinkIcon className="mr-1 h-3.5 w-3.5" />Link</TabsTrigger>
            <TabsTrigger value="upload"><Cloud className="mr-1 h-3.5 w-3.5" />Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="tmdb" className="mt-4">
            <TmdbInline />
          </TabsContent>
          <TabsContent value="link" className="mt-4">
            <LinkPanel onDone={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="upload" className="mt-4">
            <UploadDropzone onCompleted={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
        <ComingSoonRow />
      </DialogContent>
    </Dialog>
  );
}

function TmdbInline() {
  // Reuse AddMovieDialog's content by rendering its trigger inline.
  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      <p>Busque qualquer filme no TMDB com pôster, elenco e diretor automáticos.</p>
      <AddMovieDialog
        trigger={
          <Button className="w-full bg-gradient-primary text-primary-foreground shadow-glow">
            Abrir busca TMDB
          </Button>
        }
      />
    </div>
  );
}

/**
 * Unified Link panel: auto-detects Internet Archive vs direct video URL.
 */
function LinkPanel({ onDone }: { onDone: () => void }) {
  const [input, setInput] = useState("");
  const qc = useQueryClient();
  const archive = useServerFn(archiveAnalyze);
  const url = useServerFn(urlAnalyze);
  const createFn = useServerFn(createMovieFromUrl);

  const isArchive = /archive\.org/i.test(input);

  const m = useMutation({
    mutationFn: async (v: string) => {
      if (/archive\.org/i.test(v)) {
        const data = await archive({ data: { input: v } });
        return { kind: "archive" as const, data };
      }
      const data = await url({ data: { url: v } });
      return { kind: "url" as const, data };
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const importer = useMutation({
    mutationFn: (args: { title: string; url: string; mime: string; size?: number; year?: number; overview?: string; source: "internet_archive" | "url" }) =>
      createFn({
        data: {
          title: args.title,
          url: args.url,
          mimeType: args.mime,
          size: args.size,
          year: args.year,
          overview: args.overview,
          source: args.source,
        },
      }),
    onSuccess: (res) => {
      const status = res?.report?.status ?? "complete";
      toast.success(status === "complete" ? "Filme enriquecido com sucesso" : "Adicionado — alguns dados ficaram para depois");
      qc.invalidateQueries({ queryKey: ["movies"] });
      // Keep dialog open briefly so the stepper is visible; user closes manually.
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://archive.org/details/... ou link direto de vídeo .mp4"
        />
        <Button disabled={!input.trim() || m.isPending} onClick={() => m.mutate(input)}>
          {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Detecta automaticamente Internet Archive ou URL direta de vídeo (mp4, mkv, webm).
      </p>
      {m.error && <p className="text-xs text-destructive">{friendlyError(m.error)}</p>}
      {m.data && <ResultPanel result={m.data} importer={importer} />}
      {importer.data?.report && (
        <ImportProgressStepper
          steps={importer.data.report.steps as EnrichmentStep[]}
          status={importer.data.report.status}
        />
      )}
      {isArchive && !m.data && !m.isPending && (
        <p className="text-[10px] text-muted-foreground">Detectado: Internet Archive</p>
      )}
    </div>
  );
}

interface ArchiveData {
  id: string;
  title: string;
  year?: number;
  description?: string;
  files: Array<{ name: string; url: string; format: string; size?: number; duration?: number }>;
}
interface UrlData {
  url: string;
  mimeType: string;
  size?: number;
  name: string;
}
type LinkResult = { kind: "archive"; data: ArchiveData } | { kind: "url"; data: UrlData };

function ResultPanel({
  result,
  importer,
}: {
  result: LinkResult;
  importer: ReturnType<typeof useMutation<{ movieId: string }, Error, { title: string; url: string; mime: string; size?: number; year?: number; overview?: string; source: "internet_archive" | "url" }>>;
}) {
  if (result.kind === "archive") {
    const d = result.data;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{d.title}</p>
        {d.description && <p className="line-clamp-2 text-xs text-muted-foreground">{d.description}</p>}
        <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
          {d.files.map((f) => (
            <button
              key={f.name}
              type="button"
              disabled={importer.isPending}
              onClick={() =>
                importer.mutate({
                  title: d.title,
                  url: f.url,
                  mime: f.name.endsWith(".mkv") ? "video/x-matroska" : f.name.endsWith(".webm") ? "video/webm" : "video/mp4",
                  size: f.size,
                  year: d.year,
                  overview: d.description,
                  source: "internet_archive",
                })
              }
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-elevated disabled:opacity-50"
            >
              <span className="truncate">{f.name}</span>
              <Badge variant="secondary">{f.format || "vídeo"}</Badge>
            </button>
          ))}
        </div>
      </div>
    );
  }
  const d = result.data;
  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <UrlConfirm
        initialTitle={d.name}
        mime={d.mimeType}
        size={d.size}
        onConfirm={(title) =>
          importer.mutate({
            title,
            url: d.url,
            mime: d.mimeType,
            size: d.size,
            source: "url",
          })
        }
        pending={importer.isPending}
      />
    </div>
  );
}

function UrlConfirm({
  initialTitle,
  mime,
  size,
  onConfirm,
  pending,
}: {
  initialTitle: string;
  mime: string;
  size?: number;
  onConfirm: (title: string) => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  return (
    <div className="space-y-2">
      <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <p className="text-xs text-muted-foreground">
        {mime}{size ? ` · ${(size / 1e9).toFixed(2)} GB` : ""}
          </p>
      <Button disabled={pending || !title.trim()} onClick={() => onConfirm(title.trim())} className="w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
          </Button>
    </div>
  );
}

function ComingSoonRow() {
  const items = ["Google Drive", "OneDrive", "Dropbox", "NAS", "Pasta sync"];
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="mb-2 flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Clock className="h-3 w-3" /> Em desenvolvimento
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <Badge key={i} variant="secondary" className="gap-1 opacity-60">
            {i}
          </Badge>
        ))}
      </div>
    </div>
  );
}