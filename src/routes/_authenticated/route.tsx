import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search as SearchIcon, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CineVaultCopilot } from "@/components/CineVaultCopilot";
import { AddMovieDialog } from "@/components/AddMovieDialog";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/search", search: { q: q.trim() } });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/70 px-3 backdrop-blur-xl sm:px-4">
            <div className="hidden md:block">
              <SidebarTrigger />
            </div>
            <form onSubmit={submitSearch} className="relative ml-1 hidden max-w-md flex-1 sm:block">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar na sua biblioteca..."
                className="h-9 border-border bg-surface pl-9"
              />
            </form>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:block">
                <AddMovieDialog />
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="min-w-0 flex-1 pb-20 md:pb-0">
            <Outlet />
          </main>
        </div>
        <CineVaultCopilot />
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}

// avoid TS unused warning for Link in dev splits
void Link;