import { tmdbSearchOne } from "./tmdb-detail.server";

/** Clean release/codec noise from a filename to extract probable title + year. */
export function cleanFilename(raw: string): { title: string; year?: number } {
  let name = decodeURIComponent(raw)
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/[._]+/g, " ")
    .replace(/\b(1080p|720p|480p|2160p|4k|hdr|hdtv|webrip|web-?dl|bluray|brrip|dvdrip|x264|x265|h\.?264|h\.?265|hevc|aac|ac3|dts|dual|dublado|legendado)\b/gi, " ")
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  const yearMatch = name.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? Number(yearMatch[0]) : undefined;
  if (yearMatch) name = name.replace(yearMatch[0], "").trim();
  name = name.replace(/[-–—]+\s*$/, "").trim();
  return { title: name || raw, year };
}

/** Use Lovable AI to refine the title when the filename is messy. */
async function aiGuessTitle(input: string): Promise<{ title?: string; year?: number }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return {};
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Extraia o título do filme e o ano (se houver) de um nome de arquivo ou URL. Responda apenas com JSON: {\"title\":\"...\",\"year\":2010}. Se não souber o ano, omita o campo.",
          },
          { role: "user", content: input.slice(0, 400) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { title?: string; year?: number };
    return { title: parsed.title, year: parsed.year };
  } catch {
    return {};
  }
}

/** Try to identify a movie's TMDB id from a filename or URL. */
export async function identifyTmdbId(hint: string): Promise<number | null> {
  const fromFilename = cleanFilename(hint.split("/").pop() ?? hint);
  let tmdbId = await tmdbSearchOne(fromFilename.title, fromFilename.year);
  if (tmdbId) return tmdbId;
  const ai = await aiGuessTitle(hint);
  if (ai.title) {
    tmdbId = await tmdbSearchOne(ai.title, ai.year ?? fromFilename.year);
    if (tmdbId) return tmdbId;
  }
  return null;
}