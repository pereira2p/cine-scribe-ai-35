import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw, Loader2, PictureInPicture2, Cast } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export interface MyVaultPlayerProps {
  src: string;
  mimeType?: string;
  title?: string;
  startAt?: number;
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  onEnded?: () => void;
  progressIntervalMs?: number;
  onClose?: () => void;
}

export function MyVaultPlayer({
  src,
  mimeType,
  title,
  startAt = 0,
  onProgress,
  onEnded,
  progressIntervalMs = 5000,
  onClose,
}: MyVaultPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const lastTap = useRef<{ t: number; x: number } | null>(null);
  const [feedback, setFeedback] = useState<{ side: "left" | "right"; key: number } | null>(null);

  function handleDoubleTap(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.closest("button")) return;
    const v = videoRef.current;
    if (!v) return;
    const now = Date.now();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const prev = lastTap.current;
    if (prev && now - prev.t < 320 && Math.abs(prev.x - x) < 60) {
      const side = x < rect.width / 2 ? "left" : "right";
      v.currentTime = side === "left"
        ? Math.max(0, v.currentTime - 10)
        : Math.min(v.duration || v.currentTime, v.currentTime + 10);
      setFeedback({ side, key: now });
      lastTap.current = null;
      showControls();
    } else {
      lastTap.current = { t: now, x };
    }
  }

  async function togglePip() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if ((document as Document & { pictureInPictureElement?: Element }).pictureInPictureElement) {
        await (document as Document & { exitPictureInPicture?: () => Promise<void> }).exitPictureInPicture?.();
      } else if ((v as HTMLVideoElement & { requestPictureInPicture?: () => Promise<void> }).requestPictureInPicture) {
        await (v as HTMLVideoElement & { requestPictureInPicture: () => Promise<void> }).requestPictureInPicture();
      }
    } catch {
      /* noop */
    }
  }

  async function requestCast() {
    const v = videoRef.current as HTMLVideoElement & {
      remote?: { prompt?: () => Promise<void> };
    };
    if (v?.remote?.prompt) {
      try { await v.remote.prompt(); return; } catch { /* noop */ }
    }
    // eslint-disable-next-line no-alert
    alert("Transmissão indisponível neste dispositivo. AirPlay/Chromecast nativos chegam em breve.");
  }

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!videoRef.current?.paused) setControlsVisible(false);
    }, 2800);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (startAt > 0 && Number.isFinite(startAt)) {
      const onMeta = () => {
        try {
          v.currentTime = Math.min(startAt, (v.duration || startAt) - 1);
        } catch {
          /* noop */
        }
        v.removeEventListener("loadedmetadata", onMeta);
      };
      v.addEventListener("loadedmetadata", onMeta);
    }
  }, [startAt]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!onProgress) return;
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused || !Number.isFinite(v.duration)) return;
      onProgress(Math.floor(v.currentTime), Math.floor(v.duration));
    }, progressIntervalMs);
    return () => window.clearInterval(id);
  }, [onProgress, progressIntervalMs]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const v = videoRef.current;
      if (!v) return;
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        v.paused ? v.play() : v.pause();
      } else if (e.key === "ArrowRight") {
        v.currentTime = Math.min(v.duration || v.currentTime, v.currentTime + 10);
      } else if (e.key === "ArrowLeft") {
        v.currentTime = Math.max(0, v.currentTime - 10);
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === "m") {
        v.muted = !v.muted;
        setMuted(v.muted);
      }
      showControls();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showControls]);

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }

  function seek(value: number) {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = (value / 100) * v.duration;
  }

  const progressPct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="group relative h-full w-full overflow-hidden bg-black"
      onMouseMove={showControls}
      onMouseLeave={() => {
        if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
      }}
      onPointerDown={handleDoubleTap}
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "VIDEO") togglePlay();
      }}
    >
      <video
        ref={videoRef}
        className="h-full w-full"
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
      >
        <source src={src} type={mimeType ?? "video/mp4"} />
      </video>

      {buffering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      )}

      {feedback && (
        <div
          key={feedback.key}
          className={`pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/70 px-4 py-3 text-sm text-white animate-in fade-in zoom-in duration-200 ${
            feedback.side === "left" ? "left-[15%]" : "right-[15%]"
          }`}
          onAnimationEnd={() => setTimeout(() => setFeedback(null), 350)}
        >
          {feedback.side === "left" ? "⏪ -10s" : "+10s ⏩"}
        </div>
      )}

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="pointer-events-auto flex items-center justify-between gap-3">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10">
              ← Voltar
            </Button>
          )}
          {title && <p className="ml-auto truncate text-sm font-medium text-white/90">{title}</p>}
        </div>
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 pb-3 pt-12 transition-opacity duration-300 ${
          controlsVisible || !playing ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Slider
          value={[progressPct]}
          onValueChange={(v) => seek(v[0])}
          min={0}
          max={100}
          step={0.1}
          className="mb-2"
        />
        <div className="flex items-center gap-2 text-white">
          <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/10">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const v = videoRef.current;
              if (v) v.currentTime = Math.max(0, v.currentTime - 10);
            }}
            className="text-white hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const v = videoRef.current;
              if (v) v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
            }}
            className="text-white hover:bg-white/10"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              v.muted = !v.muted;
              setMuted(v.muted);
            }}
            className="text-white hover:bg-white/10"
          >
            {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <div className="hidden w-24 sm:block">
            <Slider
              value={[muted ? 0 : volume * 100]}
              onValueChange={(v) => {
                const vid = videoRef.current;
                if (!vid) return;
                vid.volume = v[0] / 100;
                vid.muted = v[0] === 0;
              }}
              min={0}
              max={100}
              step={1}
            />
          </div>
          <span className="ml-2 text-xs tabular-nums text-white/80">
            {formatTime(current)} / {formatTime(duration)}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={requestCast} className="hidden text-white hover:bg-white/10 sm:inline-flex" title="Transmitir">
              <Cast className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={togglePip} className="hidden text-white hover:bg-white/10 sm:inline-flex" title="Picture in Picture">
              <PictureInPicture2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/10">
              {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}