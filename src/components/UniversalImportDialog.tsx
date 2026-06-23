import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Link as LinkIcon, Film, Cloud, HardDrive, Folder } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddMovieDialog } from "@/components/AddMovieDialog";
import { UploadDropzone } from "@/components/UploadDropzone";
import { archiveAnalyze, urlAnalyze, createMovieFromUrl } from "@/lib/imports.functions";

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
          <DialogTitle>Adicionar à sua biblioteca</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="tmdb">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tmdb"><Film className="mr-1 h-3.5 w-3.5" />TMDB</TabsTrigger>
            <TabsTrigger value="upload"><Cloud className="mr-1 h-3.5 w-3.5" />Upload</TabsTrigger>
            <TabsTrigger value="archive"><Hdd className="mr-1 h-3.5 w-3.5" />Archive</TabsTrigger>
            <TabsTrigger value="url"><LinkIcon className="mr-1 h-3.5 w-3.5" />URL</TabsTrigger>
          </TabsList>
          <TabsContent value="tmdb" className="mt-4">
            <TmdbInline />
          </TabsContent>
          <TabsContent value="upload" className="mt-4">
            <UploadDropzone onCompleted={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="archive" className="mt-4">
            <ArchivePanel onDone={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="url" className="mt-4">
            <UrlPanel onDone={() => onOpenChange(false)} />
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

function ArchivePanel({ onDone }: { onDone: () => void }) {
  const [input, setInput] = useState("");
  const qc = useQueryClient();
  const analyze = useServerFn(archiveAnalyze);
  const createFn = useServerFn(createMovieFromUrl);

  const m = useMutation({ mutationFn: (v: string) => analyze({ data: { input: v } }) });
  const importer = useMutation({
    mutationFn: (args: { title: string; url: string; mime: string; size?: number; year?: number; overview?: string }) =>
      createFn({
        data: {
          title: args.title,
          url: args.url,
          mimeType: args.mime,
          size: args.size,
          year: args.year,
          overview: args.overview,
          source: "internet_archive",
        },
      }),
    onSuccess: () => {
      toast.success("Adicionado à biblioteca");
      qc.invalidateQueries({ queryKey: ["movies"] });
      onDone();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://archive.org/details/..."
        />
        <Button disabled={!input.trim() || m.isPending} onClick={() => m.mutate(input)}>
          {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analisar"}
        </Button>
      </div>
      {m.error && <p className="text-xs text-destructive">{(m.error as Error).message}</p>}
      {m.data && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{m.data.title}</p>
          {m.data.description && <p className="line-clamp-2 text-xs text-muted-foreground">{m.data.description}</p>}
          <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {m.data.files.map((f) => (
              <button
                key={f.name}
                type="button"
                disabled={importer.isPending}
                onClick={() =>
                  importer.mutate({
                    title: m.data!.title,
                    url: f.url,
                    mime: f.name.endsWith(".mkv") ? "video/x-matroska" : f.name.endsWith(".webm") ? "video/webm" : "video/mp4",
                    size: f.size,
                    year: m.data!.year,
                    overview: m.data!.description,
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
      )}
    </div>
  );
}

function UrlPanel({ onDone }: { onDone: () => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const qc = useQueryClient();
  const analyze = useServerFn(urlAnalyze);
  const createFn = useServerFn(createMovieFromUrl);
  const m = useMutation({ mutationFn: (v: string) => analyze({ data: { url: v } }) });
  const importer = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title: title || m.data!.name,
          url: m.data!.url,
          mimeType: m.data!.mimeType,
          size: m.data!.size,
          source: "url",
        },
      }),
    onSuccess: () => {
      toast.success("Adicionado à biblioteca");
      qc.invalidateQueries({ queryKey: ["movies"] });
      onDone();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemplo.com/filme.mp4" />
        <Button disabled={!url.trim() || m.isPending} onClick={() => m.mutate(url)}>
          {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
        </Button>
      </div>
      {m.error && <p className="text-xs text-destructive">{(m.error as Error).message}</p>}
      {m.data && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <Input placeholder="Título" value={title || m.data.name} onChange={(e) => setTitle(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            {m.data.mimeType} {m.data.size ? `· ${(m.data.size / 1e9).toFixed(2)} GB` : ""}
          </p>
          <Button disabled={importer.isPending} onClick={() => importer.mutate()} className="w-full">
            {importer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ComingSoonRow() {
  const items = [
    { label: "Google Drive", icon: Cloud },
    { label: "OneDrive", icon: Cloud },
    { label: "Dropbox", icon: Cloud },
    { label: "NAS", icon: HardDrive },
    { label: "Pasta sync", icon: Folder },
  ];
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Em breve</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <Badge key={i.label} variant="secondary" className="gap-1">
            <i.icon className="h-3 w-3" /> {i.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}