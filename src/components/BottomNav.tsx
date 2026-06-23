import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search as SearchIcon, Library, Heart, Plus } from "lucide-react";
import { useState } from "react";
import { UniversalImportDialog } from "./UniversalImportDialog";

const tabs = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/search", label: "Buscar", icon: SearchIcon },
  { to: "__add__", label: "Adicionar", icon: Plus },
  { to: "/library", label: "Biblioteca", icon: Library },
  { to: "/favorites", label: "Favoritos", icon: Heart },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/80 backdrop-blur-2xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5 gap-1 px-2 pt-1.5 pb-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            if (t.to === "__add__") {
              return (
                <li key={t.to} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    aria-label="Adicionar filme"
                    className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow active:scale-95 transition-transform"
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                </li>
              );
            }
            const active = pathname === t.to || (t.to !== "/app" && pathname.startsWith(t.to));
            return (
              <li key={t.to}>
                <Link
                  to={t.to}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="truncate">{t.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <UniversalImportDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}