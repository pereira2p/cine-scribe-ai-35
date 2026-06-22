import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Film,
  Sparkles,
  Cloud,
  Search,
  Heart,
  PlayCircle,
  Library as LibraryIcon,
  Users,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyVault — Cinema pessoal organizado por IA" },
      {
        name: "description",
        content:
          "Crie sua biblioteca pessoal de filmes. Adicione, organize e assista de qualquer lugar — com inteligência artificial cuidando da curadoria.",
      },
      { property: "og:title", content: "MyVault — Cinema pessoal organizado por IA" },
      { property: "og:description", content: "Sua Netflix particular, com a organização do Letterboxd e a inteligência de um copiloto dedicado." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-gradient-hero">
      <Nav />
      <Hero />
      <Features />
      <Phases />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Film className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight">MyVault</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-cinematic hover:brightness-110"
          >
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur"
        >
          <Sparkles className="h-3 w-3 text-primary" /> Cinema pessoal com inteligência artificial
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="text-balance mt-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl"
        >
          Sua biblioteca de filmes,{" "}
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            organizada sozinha.
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="text-balance mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg"
        >
          MyVault é a sua Netflix pessoal — adicione um filme e a IA cuida do resto: capa,
          sinopse, elenco, coleções e recomendações sob medida.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg" className="bg-gradient-primary px-6 text-primary-foreground shadow-glow hover:brightness-110">
            <Link to="/auth" search={{ mode: "signup" }}>Começar agora</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-border bg-surface/60 backdrop-blur">
            <Link to="/auth">Já tenho conta</Link>
          </Button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <div className="absolute inset-x-10 -bottom-6 h-24 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/80 shadow-elevated backdrop-blur">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-chart-3/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-chart-2/70" />
              <div className="ml-3 text-xs text-muted-foreground">myvault.app/app</div>
            </div>
            <div className="grid grid-cols-6 gap-2 p-4 sm:gap-3 sm:p-6">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] animate-pulse rounded-lg bg-gradient-to-br from-elevated to-surface"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const features = [
  { icon: Sparkles, title: "IA cuida da curadoria", desc: "Identifica filme, capa, elenco, coleção e nota automaticamente." },
  { icon: LibraryIcon, title: "Biblioteca cinematográfica", desc: "Grid premium estilo Netflix com carrosséis, filtros e busca instantânea." },
  { icon: Search, title: "Pesquisa em linguagem natural", desc: "“filmes acima de nota 8 que ainda não vi” — a IA entende você." },
  { icon: Heart, title: "Favoritos & listas", desc: "Crie listas pessoais como “Sessão de sábado” ou “Top 10”." },
  { icon: PlayCircle, title: "Continue assistindo", desc: "Retomada exata do último minuto em qualquer dispositivo." },
  { icon: Cloud, title: "Storage flexível", desc: "Cloudflare R2, Google Drive, OneDrive ou NAS — você escolhe (Fase 2)." },
  { icon: Users, title: "Compartilhe com amigos", desc: "Convites com permissões granulares e Watch Party sincronizada (Fase 4)." },
  { icon: Download, title: "Download offline", desc: "Leve seus filmes para qualquer lugar — sincroniza ao voltar online (Fase 4)." },
];

function Features() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-balance text-3xl font-bold sm:text-4xl">Tudo que você espera de um cinema pessoal premium.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Construído com arquitetura plugin-first, escalável para milhares de filmes.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur transition-cinematic hover:border-primary/30 hover:bg-surface"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary/20 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Phases() {
  const items = [
    { tag: "Fase 1 — disponível", title: "Foundation premium", desc: "Auth, biblioteca, busca TMDB, favoritos, listas, histórico, perfis." },
    { tag: "Fase 2", title: "Streaming & Player", desc: "Upload para Cloudflare R2, player próprio, legendas, continuar assistindo." },
    { tag: "Fase 3", title: "IA copiloto", desc: "Recomendações, busca natural, coleções inteligentes, organização automática." },
    { tag: "Fase 4", title: "Social", desc: "Watch Party, compartilhamento, download offline, comentários e reações." },
  ];
  return (
    <section className="px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-balance text-center text-2xl font-bold sm:text-3xl">Roadmap aberto.</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <div key={it.title} className="rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary">{it.tag}</div>
              <div className="mt-1 font-semibold">{it.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{it.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
      MyVault — feito com ❤ e Lovable.
    </footer>
  );
}