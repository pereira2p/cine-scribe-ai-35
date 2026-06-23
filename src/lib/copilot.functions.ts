import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Ask = z.object({
  prompt: z.string().min(1).max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(20).optional(),
});

export const askCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Ask.parse(i))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Copiloto indisponível: falta a chave de IA.");
    const { supabase, userId } = context;

    // Build library context (top 50 movies + genres)
    const { data: movies } = await supabase
      .from("movies")
      .select("id,title,release_year,vote_average,runtime_minutes,overview")
      .eq("user_id", userId)
      .order("vote_average", { ascending: false })
      .limit(50);

    const { data: hist } = await supabase
      .from("watch_history")
      .select("movie_id, completed")
      .eq("user_id", userId)
      .limit(50);
    const watchedIds = new Set((hist ?? []).filter((h) => h.completed).map((h) => h.movie_id));

    const libraryText = (movies ?? [])
      .map(
        (m) =>
          `- ${m.title} (${m.release_year ?? "?"}) ★${m.vote_average ?? "?"} ${m.runtime_minutes ?? "?"}min${
            watchedIds.has(m.id) ? " [assistido]" : ""
          }`,
      )
      .join("\n");

    const system = `Você é o CineVault AI, um copiloto de cinema que conhece a biblioteca pessoal do usuário. Responda em português, de forma breve e calorosa, sempre recomendando filmes da biblioteca abaixo quando fizer sentido. Considere duração quando o usuário mencionar tempo disponível, e gênero/humor quando indicado. Se o filme estiver marcado [assistido], dê preferência a algo que ele ainda não viu.\n\nBIBLIOTECA DO USUÁRIO:\n${libraryText || "(vazia — sugira que o usuário adicione filmes primeiro)"}`;

    const messages = [
      { role: "system", content: system },
      ...(data.history ?? []),
      { role: "user", content: data.prompt },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
    });
    if (res.status === 429) throw new Error("Muitas requisições — tente em alguns segundos.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados — adicione créditos no workspace.");
    if (!res.ok) throw new Error(`Copiloto falhou (${res.status})`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const answer = json.choices?.[0]?.message?.content?.trim() ?? "Não consegui responder agora.";
    return { answer };
  });