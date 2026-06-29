import { Check, X, Sparkles } from "lucide-react";

export interface EnrichmentStep {
  name: string;
  ok: boolean;
  detail?: string;
}

const LABELS: Record<string, string> = {
  identify: "Filme identificado",
  "tmdb-detail": "Metadados TMDB",
  metadata: "Título, sinopse e mídia",
  genres: "Gêneros",
  cast: "Elenco e equipe",
  collection: "Coleção / franquia",
  assets: "Assets baixados",
  tags: "Tags inteligentes",
};

export function ImportProgressStepper({
  steps,
  status,
}: {
  steps: EnrichmentStep[];
  status?: "complete" | "partial" | "failed";
}) {
  if (!steps.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        {status === "complete" ? "Biblioteca atualizada" : "Importação concluída com avisos"}
      </p>
      <ul className="space-y-1.5 text-xs">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            {s.ok ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            ) : (
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            )}
            <span className="flex-1">
              <span className={s.ok ? "text-foreground" : "text-muted-foreground"}>
                {LABELS[s.name] ?? s.name}
              </span>
              {s.detail && (
                <span className="ml-1 text-muted-foreground">— {s.detail}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}