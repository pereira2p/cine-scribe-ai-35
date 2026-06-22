import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Film, Clock, Star, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/stats")({ component: Page });

function Page() {
  const { data } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [{ count: total }, { count: watched }, { data: top }] = await Promise.all([
        supabase.from("movies").select("id", { head: true, count: "exact" }),
        supabase.from("watch_history").select("id", { head: true, count: "exact" }).eq("completed", true),
        supabase.from("movies").select("vote_average,runtime_minutes,title").order("vote_average", { ascending: false }).limit(1),
      ]);
      const { data: durations } = await supabase.from("movies").select("runtime_minutes");
      const totalMinutes = (durations ?? []).reduce((a, d) => a + (d.runtime_minutes ?? 0), 0);
      return { total: total ?? 0, watched: watched ?? 0, totalMinutes, topMovie: top?.[0] };
    },
  });
  const cards = [
    { icon: Film, label: "Filmes na biblioteca", value: data?.total ?? 0 },
    { icon: Trophy, label: "Já assistidos", value: data?.watched ?? 0 },
    { icon: Clock, label: "Horas catalogadas", value: Math.round((data?.totalMinutes ?? 0) / 60) },
    { icon: Star, label: "Melhor filme", value: data?.topMovie?.title ?? "—" },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Estatísticas</h1>
      <p className="text-sm text-muted-foreground">Gráficos avançados chegam na Fase 3 com a IA.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-surface/60 p-5">
            <c.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-2xl font-bold tracking-tight">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}