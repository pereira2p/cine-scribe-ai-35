import { createFileRoute } from "@tanstack/react-router";
import { Users, Plus, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/watch-party")({ component: Page });

function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Watch Party</h1>
          <p className="text-sm text-muted-foreground">Assista com amigos em tempo real</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Criar sala" desc="Convide pelo código ou link" icon={Plus}>
          <Button disabled className="w-full">Em breve</Button>
        </Card>
        <Card title="Entrar com código" desc="Cole o código da sala" icon={Hash}>
          <div className="flex gap-2">
            <Input placeholder="ABCD-1234" disabled />
            <Button disabled>Entrar</Button>
          </div>
        </Card>
      </div>
      <div className="mt-8 rounded-2xl border border-border bg-surface/60 p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Em desenvolvimento</p>
        <p className="mt-1">Sincronização em tempo real, chat, reações e controle remoto pelo celular chegam em breve.</p>
      </div>
    </div>
  );
}

function Card({
  title,
  desc,
  icon: Icon,
  children,
}: {
  title: string;
  desc: string;
  icon: typeof Plus;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-5">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{desc}</p>
      {children}
    </div>
  );
}