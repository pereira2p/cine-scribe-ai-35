import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Library,
  Search,
  Layers,
  Heart,
  History as HistoryIcon,
  Upload,
  Settings,
  Sparkles,
  ListChecks,
  Film,
  Activity,
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

const main = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/search", label: "Pesquisar", icon: Search },
  { to: "/library", label: "Biblioteca", icon: Library },
] as const;

const my = [
  { to: "/favorites", label: "Favoritos", icon: Heart },
  { to: "/lists", label: "Minhas Listas", icon: ListChecks },
  { to: "/collections", label: "Cole\u00e7\u00f5es", icon: Layers },
  { to: "/history", label: "Hist\u00f3rico", icon: HistoryIcon },
] as const;

const more = [
  { to: "/uploads", label: "Uploads", icon: Upload },
  { to: "/system", label: "Sistema", icon: Activity },
  { to: "/settings", label: "Configura\u00e7\u00f5es", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const Section = ({ items, label }: { items: readonly { to: string; label: string; icon: typeof Home }[]; label: string }) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
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
        <Link to="/app" className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Film className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">MyVault</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">AI Cinema</div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <Section items={main} label="Descobrir" />
        <Section items={my} label="Minha biblioteca" />
        <Section items={more} label="Sistema" />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="IA Assistente">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("myvault:open-copilot"))}
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