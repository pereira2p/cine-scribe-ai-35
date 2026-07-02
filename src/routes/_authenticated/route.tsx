import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search as SearchIcon, FolderOpen, RefreshCw } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CineVaultCopilot } from "@/components/CineVaultCopilot";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LibraryProvider, useLibrary } from "@/lib/library/context";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Shell,
});

function Shell() {
  return (
    <LibraryProvider>
      <AuthedShell />
    </LibraryProvider>
  );
}

function AuthedShell() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { hasRoot, chooseFolder, rescan, scanning, progress } = useLibrary();

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
              {hasRoot ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void rescan()}
                  disabled={scanning}
                  className="hidden gap-1.5 md:inline-flex"
                >
                  <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
                  {scanning ? "Escaneando" : "Escanear"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => void chooseFolder()}
                  className="gap-1.5 bg-gradient-primary text-primary-foreground shadow-glow"
                >
                  <FolderOpen className="h-4 w-4" />
                  Escolher pasta
                </Button>
              )}
            </div>
          </header>
          {scanning && progress && (
            <div className="border-b border-border/60 bg-surface/80 px-4 py-2 text-xs text-muted-foreground">
              Analisando ({progress.current}/{progress.total}) — {progress.name}
            </div>
          )}
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