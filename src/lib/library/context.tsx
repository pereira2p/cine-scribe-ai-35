import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getStoredRoot, pickRootDirectory, requestPermission } from "./fs";
import { fullScan, type ScanEvent } from "./scan";

interface LibraryCtx {
  hasRoot: boolean;
  scanning: boolean;
  progress: { current: number; total: number; name: string } | null;
  chooseFolder: () => Promise<void>;
  rescan: () => Promise<void>;
  needsPermission: boolean;
  grantPermission: () => Promise<void>;
}

const Ctx = createContext<LibraryCtx | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [hasRoot, setHasRoot] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<LibraryCtx["progress"]>(null);

  useEffect(() => {
    void (async () => {
      const h = await getStoredRoot();
      setHasRoot(Boolean(h));
    })();
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    setProgress(null);
    try {
      const added = await fullScan((ev: ScanEvent) => {
        if (ev.type === "progress") {
          setProgress({ current: ev.current, total: ev.total, name: ev.name });
        }
        if (ev.type === "scanned") toast.info(`${ev.total} arquivos encontrados`);
        if (ev.type === "error") toast.error(ev.message);
      });
      if (added > 0) toast.success(`${added} filme(s) adicionado(s) à biblioteca`);
      else toast.info("Nenhum filme novo encontrado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao escanear");
    } finally {
      setScanning(false);
      setProgress(null);
    }
  }, []);

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

  const value = useMemo(
    () => ({ hasRoot, scanning, progress, chooseFolder, rescan, needsPermission, grantPermission }),
    [hasRoot, scanning, progress, chooseFolder, rescan, needsPermission, grantPermission],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary(): LibraryCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLibrary must be used inside LibraryProvider");
  return v;
}