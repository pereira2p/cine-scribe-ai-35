import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

interface TagInput {
  title: string;
  overview?: string | null;
  genres: string[];
  keywords: string[];
  voteAverage?: number | null;
}

/** Use Lovable AI to pick smart tags from the fixed vocabulary. */
export async function suggestSmartTags(input: TagInput): Promise<string[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return [];
  const vocab = [
    "cult","mind-blowing","cyberpunk","oscar","slow-burn","plot-twist",
    "espacial","viagem-no-tempo","heist","noir","coming-of-age",
    "tear-jerker","feel-good","body-horror","found-footage",
  ];
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              `Você classifica filmes em tags. Use APENAS slugs desta lista: ${vocab.join(", ")}. ` +
              `Retorne JSON {"tags":["slug1","slug2"]} com no máximo 5 tags relevantes. ` +
              `Se nenhuma encaixar, retorne {"tags":[]}.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              title: input.title,
              overview: input.overview?.slice(0, 600) ?? "",
              genres: input.genres,
              keywords: input.keywords.slice(0, 20),
              rating: input.voteAverage,
            }),
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { tags?: string[] };
    return (parsed.tags ?? []).filter((t) => vocab.includes(t));
  } catch {
    return [];
  }
}

/** Attach smart tag slugs to a movie (creates missing slugs if any). */
export async function applySmartTags(
  supabase: SupabaseClient<Database>,
  userId: string,
  movieId: string,
  slugs: string[],
): Promise<number> {
  if (!slugs.length) return 0;
  const { data: tags } = await supabase
    .from("smart_tags")
    .select("id, slug")
    .in("slug", slugs);
  if (!tags?.length) return 0;
  const rows = tags.map((t) => ({ movie_id: movieId, tag_id: t.id, user_id: userId }));
  await supabase.from("movie_smart_tags").upsert(rows, { onConflict: "movie_id,tag_id" });
  return rows.length;
}