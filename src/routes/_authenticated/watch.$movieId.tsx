import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { getMovieStream, getPlaybackProgress, recordPlaybackProgress } from "@/lib/uploads.functions";
import { MyVaultPlayer } from "@/components/player/MyVaultPlayer";

export const Route = createFileRoute("/_authenticated/watch/$movieId")({
  component: WatchPage,
});

function WatchPage() {
  const { movieId } = Route.useParams();
  const navigate = useNavigate();
  const streamFn = useServerFn(getMovieStream);
  const progressFn = useServerFn(getPlaybackProgress);
  const recordFn = useServerFn(recordPlaybackProgress);
  const lastSavedRef = useRef(0);

  const { data: stream, isLoading, error } = useQuery({
    queryKey: ["stream", movieId],
    queryFn: () => streamFn({ data: { movieId } }),
    retry: false,
  });

  const { data: progress } = useQuery({
    queryKey: ["playback-progress", movieId],
    queryFn: () => progressFn({ data: { movieId } }),
  });

  const handleProgress = useCallback(
    (position: number, duration: number) => {
      if (Math.abs(position - lastSavedRef.current) < 4) return;
      lastSavedRef.current = position;
      recordFn({ data: { movieId, positionSeconds: position, durationSeconds: duration } }).catch(() => {});
    },
    [movieId, recordFn],
  );

  const handleEnded = useCallback(() => {
    recordFn({
      data: { movieId, positionSeconds: 0, durationSeconds: stream?.durationSeconds ?? 0, completed: true },
    }).catch(() => {});
    toast.success("Marcado como assistido");
  }, [movieId, recordFn, stream?.durationSeconds]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white/70">
        Preparando playback...
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white/80">
        <p className="text-lg">Não foi possível carregar este filme.</p>
        <p className="text-sm text-white/50">
          {(error as Error | undefined)?.message ?? "Sem arquivo associado."}
        </p>
        <button
          onClick={() => navigate({ to: "/movie/$movieId", params: { movieId } })}
          className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
        >
          ← Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <MyVaultPlayer
        src={stream.url}
        mimeType={stream.mimeType}
        title={stream.title}
        startAt={progress?.completed ? 0 : progress?.last_position_seconds ?? 0}
        onProgress={handleProgress}
        onEnded={handleEnded}
        onClose={() => navigate({ to: "/movie/$movieId", params: { movieId } })}
      />
    </div>
  );
}