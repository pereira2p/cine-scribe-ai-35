import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/local";
import { requestPermission } from "@/lib/library/fs";

export const Route = createFileRoute("/_authenticated/watch/$movieId")({
  component: WatchPage,
});

function WatchPage() {
  const { movieId } = Route.useParams();
  const tmdbId = Number(movieId);
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      const movie = await db.movies.get(tmdbId);
      if (!movie) {
        if (!cancelled) throw notFound();
        return;
      }
      if (!cancelled) setTitle(movie.title);
      if (!movie.filePath) {
        if (!cancelled) setError("Este filme não tem arquivo local associado.");
        return;
      }
      const record = await db.files.get(movie.filePath);
      if (!record?.handle) {
        if (!cancelled) setError("Arquivo local não encontrado. Reescaneie a pasta.");
        return;
      }
      try {
        const ok = await requestPermission(
          (record.handle as unknown as { queryPermission?: unknown }) as unknown as FileSystemDirectoryHandle,
        ).catch(() => true);
        if (!ok && !cancelled) {
          setError("Permissão negada para ler o arquivo.");
          return;
        }
        const file = await record.handle.getFile();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(file);
        setSrc(objectUrl);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao abrir o arquivo.");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [tmdbId]);

  // Restore progress + persist on interval.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    let saveTimer: number | null = null;

    const onLoaded = async () => {
      const p = await db.progress.get(tmdbId);
      if (p && p.position > 5 && p.position < (v.duration || Infinity) - 15) {
        v.currentTime = p.position;
      }
    };
    const persist = async () => {
      if (!v.duration || Number.isNaN(v.duration)) return;
      const completed = v.currentTime >= v.duration * 0.95;
      await db.progress.put({
        movieId: tmdbId,
        position: v.currentTime,
        duration: v.duration,
        updatedAt: Date.now(),
        completed,
      });
    };
    const onPlay = () => {
      if (saveTimer) window.clearInterval(saveTimer);
      saveTimer = window.setInterval(() => void persist(), 5000);
    };
    const onPause = () => {
      if (saveTimer) window.clearInterval(saveTimer);
      saveTimer = null;
      void persist();
    };
    const onEnded = async () => {
      await persist();
      await db.history.add({ movieId: tmdbId, watchedAt: Date.now(), completed: true });
      toast.success("Sessão salva no histórico.");
    };

    // Log a history entry on first play.
    let historyLogged = false;
    const onFirstPlay = async () => {
      if (historyLogged) return;
      historyLogged = true;
      await db.history.add({ movieId: tmdbId, watchedAt: Date.now(), completed: false });
    };

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("play", onPlay);
    v.addEventListener("play", onFirstPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("play", onFirstPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      if (saveTimer) window.clearInterval(saveTimer);
      void persist();
    };
  }, [src, tmdbId]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/movie/$movieId", params: { movieId } })} className="gap-1 text-white hover:bg-white/10">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="line-clamp-1 text-sm font-medium">{title}</div>
        <div className="w-16" />
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        {error ? (
          <div className="max-w-md p-6 text-center text-sm text-white/80">{error}</div>
        ) : src ? (
          <video
            ref={videoRef}
            src={src}
            controls
            autoPlay
            playsInline
            className="h-full max-h-full w-full max-w-full bg-black"
          />
        ) : (
          <div className="text-sm text-white/70">Carregando arquivo local...</div>
        )}
      </div>
    </div>
  );
}