import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, X, CheckCircle2, AlertTriangle, Loader2, FileVideo } from "lucide-react";
import { toast } from "sonner";
import { abortUpload, completeUpload, createUploadIntent } from "@/lib/uploads.functions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UploadDropzoneProps {
  movieId?: string;
  onCompleted?: (movieId: string) => void;
  accept?: string;
}

type Item = {
  id: string;
  file: File;
  uploadId?: string;
  progress: number;
  status: "queued" | "uploading" | "completed" | "failed" | "aborted";
  error?: string;
  xhr?: XMLHttpRequest;
};

const MAX_BYTES = 5 * 1024 * 1024 * 1024;
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/x-matroska", "video/quicktime"];

function inferMime(file: File): string {
  if (file.type) return file.type;
  if (file.name.endsWith(".mkv")) return "video/x-matroska";
  if (file.name.endsWith(".webm")) return "video/webm";
  if (file.name.endsWith(".mov")) return "video/quicktime";
  return "video/mp4";
}

export function UploadDropzone({ movieId, onCompleted, accept = "video/*" }: UploadDropzoneProps) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const createIntent = useServerFn(createUploadIntent);
  const complete = useServerFn(completeUpload);
  const abort = useServerFn(abortUpload);

  const startUpload = useCallback(
    async (item: Item) => {
      try {
        if (item.file.size > MAX_BYTES) throw new Error("Arquivo acima do limite de 5 GB.");
        const mime = inferMime(item.file);
        const intent = await createIntent({
          data: { filename: item.file.name, size: item.file.size, mimeType: mime, movieId },
        });
        const xhr = new XMLHttpRequest();
        setItems((s) =>
          s.map((it) => (it.id === item.id ? { ...it, uploadId: intent.uploadId, status: "uploading", xhr } : it)),
        );
        xhr.open("PUT", intent.uploadUrl, true);
        for (const [k, v] of Object.entries(intent.headers)) xhr.setRequestHeader(k, v);
        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          const pct = Math.round((e.loaded / e.total) * 100);
          setItems((s) => s.map((it) => (it.id === item.id ? { ...it, progress: pct } : it)));
        };
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const duration = await readVideoDuration(item.file).catch(() => undefined);
              const res = await complete({
                data: { uploadId: intent.uploadId, movieId, durationSeconds: duration },
              });
              setItems((s) =>
                s.map((it) => (it.id === item.id ? { ...it, progress: 100, status: "completed" } : it)),
              );
              toast.success(`"${item.file.name}" pronto para assistir.`);
              qc.invalidateQueries({ queryKey: ["movie"] });
              qc.invalidateQueries({ queryKey: ["uploads"] });
              onCompleted?.(res.movieId);
            } catch (e) {
              setItems((s) =>
                s.map((it) =>
                  it.id === item.id ? { ...it, status: "failed", error: (e as Error).message } : it,
                ),
              );
              toast.error((e as Error).message);
            }
          } else {
            setItems((s) =>
              s.map((it) =>
                it.id === item.id ? { ...it, status: "failed", error: `HTTP ${xhr.status}` } : it,
              ),
            );
          }
        };
        xhr.onerror = () => {
          setItems((s) =>
            s.map((it) =>
              it.id === item.id ? { ...it, status: "failed", error: "Falha de rede" } : it,
            ),
          );
        };
        xhr.send(item.file);
      } catch (e) {
        setItems((s) =>
          s.map((it) =>
            it.id === item.id ? { ...it, status: "failed", error: (e as Error).message } : it,
          ),
        );
        toast.error((e as Error).message);
      }
    },
    [createIntent, complete, movieId, onCompleted, qc],
  );

  const onFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const next: Item[] = [];
      Array.from(files).forEach((f) => {
        if (!VIDEO_TYPES.includes(f.type) && !/\.(mp4|webm|mkv|mov)$/i.test(f.name)) {
          toast.error(`Formato não suportado: ${f.name}`);
          return;
        }
        next.push({ id: crypto.randomUUID(), file: f, progress: 0, status: "queued" });
      });
      if (!next.length) return;
      setItems((s) => [...next, ...s]);
      next.forEach((it) => void startUpload(it));
    },
    [startUpload],
  );

  function cancel(item: Item) {
    item.xhr?.abort();
    setItems((s) => s.map((it) => (it.id === item.id ? { ...it, status: "aborted" } : it)));
    if (item.uploadId) abort({ data: { uploadId: item.uploadId, reason: "user_cancelled" } }).catch(() => {});
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-surface/40 hover:border-primary/60"
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">Arraste arquivos ou clique para enviar</p>
          <p className="mt-1 text-xs text-muted-foreground">
            MP4, WebM, MKV ou MOV — até 5 GB por arquivo
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-border bg-surface/60 p-3">
              <div className="flex items-center gap-3">
                <FileVideo className="h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(it.file.size / 1024 / 1024).toFixed(1)} MB
                    {it.error ? ` • ${it.error}` : ""}
                  </p>
                </div>
                <StatusBadge status={it.status} />
                {(it.status === "uploading" || it.status === "queued") && (
                  <Button variant="ghost" size="icon" onClick={() => cancel(it)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {(it.status === "uploading" || it.status === "queued") && (
                <Progress value={it.progress} className="mt-2 h-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Item["status"] }) {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> Pronto
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" /> Falhou
      </span>
    );
  if (status === "aborted") return <span className="text-xs text-muted-foreground">Cancelado</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando
    </span>
  );
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.floor(v.duration));
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a duração"));
    };
    v.src = url;
  });
}