import { searchMovie, type TmdbSearchHit } from "@/lib/tmdb/client";

const NOISE = new RegExp(
  "\\b(1080p|720p|480p|2160p|4k|hdr|hdtv|webrip|web-?dl|bluray|brrip|dvdrip|" +
    "x264|x265|h\\.?264|h\\.?265|hevc|aac|ac3|dts|dual|dublado|legendado|" +
    "5\\.1|remux|proper|repack|extended|imax|open\\.?matte)\\b",
  "gi",
);

export function cleanFilename(raw: string): { title: string; year?: number } {
  let name = raw.replace(/\.[a-z0-9]{2,4}$/i, "");
  name = name.replace(/[._]+/g, " ").replace(/\s{2,}/g, " ");
  name = name.replace(/\[[^\]]*\]/g, " ").replace(NOISE, " ");
  const yearMatch = name.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? Number(yearMatch[0]) : undefined;
  if (yearMatch) {
    name = name.slice(0, yearMatch.index).trim();
  }
  name = name.replace(/\([^)]*\)/g, " ").replace(/[-–—]+$/g, " ").replace(/\s{2,}/g, " ").trim();
  return { title: name || raw, year };
}

export async function identifyFile(
  filename: string,
): Promise<{ title: string; year?: number; candidates: TmdbSearchHit[] }> {
  const base = filename.split("/").pop() ?? filename;
  const { title, year } = cleanFilename(base);
  let candidates = await searchMovie(title, year);
  if (candidates.length === 0 && year) {
    candidates = await searchMovie(title);
  }
  return { title, year, candidates: candidates.slice(0, 5) };
}