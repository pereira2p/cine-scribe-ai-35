import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getStoredRoot, pickRootDirectory, requestPermission } from "./fs";
import { fullScan, enrichFromTmdb, type ScanEvent } from "./scan";
import { db } from "@/lib/db/local";
import type { ScannedFile } from "./fs";
import type { TmdbSearchHit } from "@/lib/tmdb/client";

export interface DiagLog {
  level: "info" | "warn" | "error";
  message: string;
  at: number;
}

export interface PendingPick {
  file: ScannedFile;
  query: string;
  candidates: TmdbSearchHit[];
}

export interface DiagStats {
  filesFound: number;
  identified: number;
  errors: number;
  lastError: string | null;
  lastScanAt: number | null;
}

interface LibraryCtx {
  hasRoot: boolean;
  scanning: boolean;
  progress: { current: number; total: number; name: string } | null;
  chooseFolder: () => Promise<void>;
  rescan: () => Promise<void>;
  needsPermission: boolean;
  grantPermission: () => Promise<void>;
  logs: DiagLog[];
  clearLogs: () => void;
  pending: PendingPick[];
  currentPick: PendingPick | null;
  openPicker: (p: PendingPick) => void;
  closePicker: () => void;
  resolvePick: (tmdbId: number) => Promise<void>;
  skipPick: () => void;
  stats: DiagStats;
}

const Ctx = createContext<LibraryCtx | null>(null);
const MAX_LOGS = 500;

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [hasRoot, setHasRoot] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<LibraryCtx["progress"]>(null);
  const [logs, setLogs] = useState<DiagLog[]>([]);
  const [pending, setPending] = useState<PendingPick[]>([]);
  const [currentPick, setCurrentPick] = useState<PendingPick | null>(null);
  const [stats, setStats] = useState<DiagStats>({
    filesFound: 0,
    identified: 0,
    errors: 0,
    lastError: null,
    lastScanAt: null,
  });
  const logBuffer = useRef<DiagLog[]>([]);

  const pushLog = useCallback((l: DiagLog) => {
    logBuffer.current = [...logBuffer.current, l].slice(-MAX_LOGS);
    setLogs(logBuffer.current);
  }, []);

  useEffect(() => {
    void (async () => {
      const h = await getStoredRoot();
      setHasRoot(Boolean(h));
    })();
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    setProgress(null);
    let errors = 0;
    let filesFound = 0;
    let identified = 0;
    let lastError: string | null = null;
    const localPending: PendingPick[] = [];
    pushLog({ level: "info", message: "Scan iniciado", at: Date.now() });
    try {
      const added = await fullScan((ev: ScanEvent) => {
        if (ev.type === "progress") {
          setProgress({ current: ev.current, total: ev.total, name: ev.name });
        }
        if (ev.type === "scanned") {
          filesFound = ev.total;
          pushLog({ level: "info", message: `${ev.total} arquivo(s) encontrado(s)`, at: Date.now() });
          toast.info(`${ev.total} arquivos encontrados`);
        }
        if (ev.type === "log") {
          if (ev.level === "error") errors++;
          if (ev.level === "error") lastError = ev.message;
          if (ev.level === "info" && ev.message.startsWith("Identificado:")) identified++;
          pushLog({ level: ev.level, message: ev.message, at: Date.now() });
        }
        if (ev.type === "needsPick") {
          localPending.push({ file: ev.file, query: ev.query, candidates: ev.candidates });
        }
        if (ev.type === "error") {
          errors++;
          lastError = ev.message;
          pushLog({ level: "error", message: ev.message, at: Date.now() });
          toast.error(ev.message);
        }
      });
      if (localPending.length > 0) {
        setPending((prev) => [...prev, ...localPending]);
        setCurrentPick((cur) => cur ?? localPending[0]);
        toast.info(`${localPending.length} filme(s) precisam de confirmação`);
      }
      if (added > 0) toast.success(`${added} filme(s) adicionado(s) à biblioteca`);
      else if (localPending.length === 0) toast.info("Nenhum filme novo encontrado");
      pushLog({ level: "info", message: `Scan concluído — ${added} adicionados, ${localPending.length} pendentes, ${errors} erros`, at: Date.now() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao escanear";
      lastError = msg;
      errors++;
      pushLog({ level: "error", message: msg, at: Date.now() });
      toast.error(msg);
    } finally {
      setScanning(false);
      setProgress(null);
      setStats({ filesFound, identified, errors, lastError, lastScanAt: Date.now() });
    }
  }, [pushLog]);

  const chooseFolder = useCallback(async () => {
    try {
      const h = await pickRootDirectory();
      if (!h) {
        toast.error("Seu navegador não suporta seleção de pasta. Use Chrome, Edge ou Brave.");
        return;
      }
      setHasRoot(true);
      setNeedsPermission(false);
      toast.success("Pasta selecionada. Escaneando...");
      await runScan();
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      toast.error(e instanceof Error ? e.message : "Falha ao escolher pasta");
    }
  }, [runScan]);

  const rescan = useCallback(async () => {
    const h = await getStoredRoot();
    if (!h) return chooseFolder();
    const ok = await requestPermission(h);
    if (!ok) {
      setNeedsPermission(true);
      toast.error("Permissão negada para ler a pasta.");
      return;
    }
    setNeedsPermission(false);
    await runScan();
  }, [chooseFolder, runScan]);

  const grantPermission = useCallback(async () => {
    const h = await getStoredRoot();
    if (!h) return chooseFolder();
    const ok = await requestPermission(h);
    setNeedsPermission(!ok);
    if (ok) await runScan();
  }, [chooseFolder, runScan]);

  const openPicker = useCallback((p: PendingPick) => setCurrentPick(p), []);
  const closePicker = useCallback(() => setCurrentPick(null), []);
  const clearLogs = useCallback(() => {
    logBuffer.current = [];
    setLogs([]);
  }, []);

  const nextPick = useCallback((remaining: PendingPick[]) => {
    setPending(remaining);
    setCurrentPick(remaining[0] ?? null);
  }, []);

  const resolvePick = useCallback(
    async (tmdbId: number) => {
      const cur = currentPick;
      if (!cur) return;
      try {
        const movie = await enrichFromTmdb(tmdbId, cur.file.path);
        await db.movies.put(movie);
        await db.files.update(cur.file.path, { movieId: movie.tmdbId });
        pushLog({ level: "info", message: `Escolhido: ${cur.file.name} → ${movie.title}`, at: Date.now() });
        toast.success(`${movie.title} adicionado`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        pushLog({ level: "error", message: `Falha ao aplicar escolha: ${msg}`, at: Date.now() });
        toast.error(msg);
      }
      nextPick(pending.filter((p) => p.file.path !== cur.file.path));
    },
    [currentPick, pending, pushLog, nextPick],
  );

  const skipPick = useCallback(() => {
    const cur = currentPick;
    if (!cur) return;
    pushLog({ level: "warn", message: `Ignorado: ${cur.file.name}`, at: Date.now() });
    nextPick(pending.filter((p) => p.file.path !== cur.file.path));
  }, [currentPick, pending, pushLog, nextPick]);

  const value = useMemo(
    () => ({
      hasRoot,
      scanning,
      progress,
      chooseFolder,
      rescan,
      needsPermission,
      grantPermission,
      logs,
      clearLogs,
      pending,
      currentPick,
      openPicker,
      closePicker,
      resolvePick,
      skipPick,
      stats,
    }),
    [hasRoot, scanning, progress, chooseFolder, rescan, needsPermission, grantPermission, logs, clearLogs, pending, currentPick, openPicker, closePicker, resolvePick, skipPick, stats],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary(): LibraryCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLibrary must be used inside LibraryProvider");
  return v;
}