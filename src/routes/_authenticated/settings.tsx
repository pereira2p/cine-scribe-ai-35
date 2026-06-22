import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("user_settings").select("*").maybeSingle()).data,
  });
  const { data: viewerProfiles } = useQuery({
    queryKey: ["viewer-profiles"],
    queryFn: async () => (await supabase.from("viewer_profiles").select("*").order("created_at")).data ?? [],
  });

  const [language, setLanguage] = useState("pt-BR");
  const [quality, setQuality] = useState("auto");
  const [autoplay, setAutoplay] = useState(true);
  const [newProfile, setNewProfile] = useState("");

  useEffect(() => {
    if (settings) {
      setLanguage(settings.language);
      setQuality(settings.default_quality);
      setAutoplay(settings.autoplay_next);
    }
  }, [settings]);

  async function save() {
    const { error } = await supabase
      .from("user_settings")
      .update({ language, default_quality: quality, autoplay_next: autoplay })
      .eq("user_id", (await supabase.auth.getUser()).data.user!.id);
    if (error) toast.error(error.message);
    else toast.success("Preferências salvas");
  }

  async function addProfile() {
    if (!newProfile.trim()) return;
    const u = (await supabase.auth.getUser()).data.user!;
    const { error } = await supabase.from("viewer_profiles").insert({ user_id: u.id, name: newProfile.trim() });
    if (error) return toast.error(error.message);
    setNewProfile("");
    qc.invalidateQueries({ queryKey: ["viewer-profiles"] });
  }
  async function removeProfile(id: string) {
    await supabase.from("viewer_profiles").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["viewer-profiles"] });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

      <section className="space-y-4 rounded-2xl border border-border bg-surface/60 p-6">
        <h2 className="text-lg font-semibold">Preferências de reprodução</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Idioma</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-elevated"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (BR)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="es-ES">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Qualidade padrão</Label>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger className="bg-elevated"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automática</SelectItem>
                <SelectItem value="1080p">1080p</SelectItem>
                <SelectItem value="720p">720p</SelectItem>
                <SelectItem value="480p">480p</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border bg-elevated px-4 py-3">
          <div>
            <p className="text-sm font-medium">Reproduzir próximo automaticamente</p>
            <p className="text-xs text-muted-foreground">Avança para o próximo filme da fila</p>
          </div>
          <Switch checked={autoplay} onCheckedChange={setAutoplay} />
        </div>
        <Button onClick={save} className="bg-gradient-primary text-primary-foreground shadow-glow">Salvar</Button>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface/60 p-6">
        <h2 className="text-lg font-semibold">Perfis</h2>
        <p className="text-sm text-muted-foreground">Cada perfil tem seus próprios favoritos e histórico.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {viewerProfiles?.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-elevated px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground" style={{ background: p.avatar_color }}>
                {p.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="flex-1 truncate text-sm">{p.name}</span>
              {!p.is_default && (
                <Button variant="ghost" size="sm" onClick={() => removeProfile(p.id)}>Remover</Button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input value={newProfile} onChange={(e) => setNewProfile(e.target.value)} placeholder="Novo perfil (ex: Namorada)" />
          <Button onClick={addProfile}>Adicionar</Button>
        </div>
      </section>
    </div>
  );
}