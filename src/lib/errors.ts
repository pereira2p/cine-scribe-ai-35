/**
 * Centralized friendly error mapping — never expose stack traces / raw provider errors.
 */
export function friendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  const lower = raw.toLowerCase();

  if (!raw) return "Algo deu errado. Tente novamente.";
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("muitas requisi"))
    return "Muitas requisições. Tente novamente em alguns segundos.";
  if (lower.includes("402") || lower.includes("cr\u00e9ditos") || lower.includes("credit"))
    return "Limite da IA atingido por agora. Tente uma busca simples.";
  if (lower.includes("nenhum") || lower.includes("not found") || lower.includes("404"))
    return "Nenhum resultado encontrado.";
  if (lower.includes("fetch") || lower.includes("network") || lower.includes("acessar") || lower.includes("timeout"))
    return "Não foi possível acessar essa fonte agora.";
  if (lower.includes("unauthorized") || lower.includes("401") || lower.includes("forbidden") || lower.includes("403"))
    return "Sessão expirada. Entre novamente.";
  if (lower.includes("tmdb")) return "A busca de metadados está indisponível no momento.";
  // last resort: keep messages curated by the server (they're already in PT)
  if (raw.length < 140 && /[a-záéíóúãõçà]/i.test(raw)) return raw;
  return "Algo deu errado. Tente novamente.";
}
