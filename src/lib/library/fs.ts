import { get, set, del } from "idb-keyval";

const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm|m4v)$/i;
const ROOT_KEY = "cinevault:rootHandle";

export const hasFsAccess =
  typeof window !== "undefined" && "showDirectoryPicker" in window;

type DirHandle = FileSystemDirectoryHandle & {
  queryPermission: (opts: { mode: "read" }) => Promise<PermissionState>;
  requestPermission: (opts: { mode: "read" }) => Promise<PermissionState>;
  entries: () => AsyncIterable<[string, FileSystemHandle]>;
};

export async function pickRootDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!hasFsAccess) return null;
  const handle = await (
    window as unknown as {
      showDirectoryPicker: (opts: {
        id: string;
        mode: "read";
      }) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker({ id: "cinevault-root", mode: "read" });
  await set(ROOT_KEY, handle);
  return handle;
}

export async function getStoredRoot(): Promise<FileSystemDirectoryHandle | null> {
  const h = (await get(ROOT_KEY)) as FileSystemDirectoryHandle | undefined;
  return h ?? null;
}

export async function requestPermission(h: FileSystemDirectoryHandle): Promise<boolean> {
  const d = h as unknown as DirHandle;
  const perm = await d.queryPermission({ mode: "read" });
  if (perm === "granted") return true;
  const asked = await d.requestPermission({ mode: "read" });
  return asked === "granted";
}

export async function clearRoot() {
  await del(ROOT_KEY);
}

export interface ScannedFile {
  path: string;
  name: string;
  size: number;
  lastModified: number;
  handle: FileSystemFileHandle;
}

export async function scanDirectory(
  root: FileSystemDirectoryHandle,
  base = "",
): Promise<ScannedFile[]> {
  const out: ScannedFile[] = [];
  const dir = root as unknown as DirHandle;
  for await (const [name, handle] of dir.entries()) {
    const path = base ? `${base}/${name}` : name;
    if (handle.kind === "directory") {
      const sub = await scanDirectory(handle as FileSystemDirectoryHandle, path);
      out.push(...sub);
    } else if (VIDEO_EXT.test(name)) {
      const fh = handle as FileSystemFileHandle;
      try {
        const file = await fh.getFile();
        out.push({ path, name, size: file.size, lastModified: file.lastModified, handle: fh });
      } catch {
        // skip inaccessible
      }
    }
  }
  return out;
}

export async function readFileFromHandle(h: FileSystemFileHandle): Promise<File> {
  return h.getFile();
}