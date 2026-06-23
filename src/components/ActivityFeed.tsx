import { useQuery } from "@tanstack/react-query";
import { Activity as ActivityIcon, Plus, Check, Heart, ListPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ICONS: Record<string, typeof Plus> = {
  movie_added: Plus,
  movie_completed: Check,
  favorited: Heart,
  list_created: ListPlus,
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function ActivityFeed() {
  const { data } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_feed")
        .select("id, kind, payload, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });
  if (!data || data.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ActivityIcon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Atividade recente</h2>
      </div>
      <ul className="space-y-1.5">
        {data.map((e) => {
          const Icon = ICONS[e.kind] ?? ActivityIcon;
          const payload = (e.payload ?? {}) as Record<string, unknown>;
          const title = (payload.title as string) ?? "";
          return (
            <li key={e.id} className="flex items-center gap-3 rounded-xl border border-border/40 bg-surface/40 px-3 py-2 text-sm">
              <Icon className="h-4 w-4 text-primary" />
              <span className="flex-1 truncate">
                <strong className="font-medium">{labelFor(e.kind)}</strong>
                {title && <span className="text-muted-foreground"> · {title}</span>}
              </span>
              <span className="text-xs text-muted-foreground">{timeAgo(e.created_at)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function labelFor(kind: string): string {
  switch (kind) {
    case "movie_added": return "Filme adicionado";
    case "movie_completed": return "Filme concluído";
    case "favorited": return "Favoritado";
    case "list_created": return "Lista criada";
    default: return kind;
  }
}