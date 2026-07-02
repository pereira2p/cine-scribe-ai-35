import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Library,
  Search,
  Heart,
  History as HistoryIcon,
  Settings,
  Sparkles,
  Film,
  RefreshCw,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLibrary } from "@/lib/library/context";

const main = [
  { to: "/", label: "Início", icon: Home },
  { to: "/library", label: "Biblioteca", icon: Library },
  { to: "/search", label: "Pesquisar", icon: Search },
] as const;

const my = [
  { to: "/favorites", label: "Favoritos", icon: Heart },
  { to: "/history", label: "Histórico", icon: HistoryIcon },
] as const;

const more = [
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { rescan, scanning } = useLibrary();

  const Section = ({
    items,
    label,
  }: {
    items: readonly { to: string; label: string; icon: typeof Home }[];
    label: string;
  }) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to + "/"));
            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                  <Link to={item.to} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Film className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">CineVault</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Portable</div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <Section items={main} label="Navegar" />
        <Section items={my} label="Minha biblioteca" />
        <Section items={more} label="Sistema" />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Escanear pasta"
                  disabled={scanning}
                >
                  <button
                    type="button"
                    onClick={() => void rescan()}
                    className="flex w-full items-center gap-3"
                  >
                    <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
                    {!collapsed && (
                      <span className="truncate">{scanning ? "Escaneando..." : "Escanear pasta"}</span>
                    )}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="IA (em breve)">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("cinevault:open-copilot"))}
                    className="flex w-full items-center gap-3"
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                    {!collapsed && <span className="truncate">IA Assistente</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}