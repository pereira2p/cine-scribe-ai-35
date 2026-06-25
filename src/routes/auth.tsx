import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Film, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Checkbox } from "@/components/ui/checkbox";

const SearchSchema = z.object({ mode: z.enum(["signin", "signup"]).default("signin") });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => SearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Entrar — MyVault" },
      { name: "description", content: "Acesse sua biblioteca pessoal de filmes." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mv_last_email");
      const pref = localStorage.getItem("mv_remember_me");
      if (saved) setEmail(saved);
      if (pref === "0") setRemember(false);
    } catch {
      // ignore
    }
  }, []);

  function applyRememberPreference(persist: boolean) {
    try {
      localStorage.setItem("mv_remember_me", persist ? "1" : "0");
      if (persist) {
        localStorage.setItem("mv_last_email", email);
      } else {
        localStorage.removeItem("mv_last_email");
      }
    } catch {
      // ignore storage errors
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/app", data: { full_name: name } },
        });
        if (error) throw error;
        applyRememberPreference(remember);
        toast.success("Conta criada. Verifique seu e-mail se necessário.");
        navigate({ to: "/app" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        applyRememberPreference(remember);
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    applyRememberPreference(remember);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (res.error) {
      toast.error(res.error instanceof Error ? res.error.message : "Falha no Google");
      setLoading(false);
      return;
    }
    if (!res.redirected) {
      navigate({ to: "/app" });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Film className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight">MyVault</span>
        </Link>
        <div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-elevated backdrop-blur">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6 space-y-4">
              <h1 className="text-xl font-semibold">Bem-vindo de volta</h1>
            </TabsContent>
            <TabsContent value="signup" className="mt-6 space-y-4">
              <h1 className="text-xl font-semibold">Crie seu cinema pessoal</h1>
            </TabsContent>
          </Tabs>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading}
            className="mt-4 w-full gap-2"
          >
            <GoogleIcon /> Continuar com Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou e-mail <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {tab === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
              <Checkbox
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
              />
              Lembrar de mim neste dispositivo
            </label>
            <Button type="submit" disabled={loading} className="w-full gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:brightness-110">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {tab === "signup" ? "Criar conta" : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 11v3.6h5.1c-.2 1.4-1.6 4.1-5.1 4.1-3.1 0-5.6-2.5-5.6-5.7s2.5-5.7 5.6-5.7c1.8 0 2.9.7 3.6 1.4l2.5-2.4C16.5 4.7 14.5 4 12 4 7 4 3 8 3 13s4 9 9 9c5.2 0 8.6-3.7 8.6-8.9 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}