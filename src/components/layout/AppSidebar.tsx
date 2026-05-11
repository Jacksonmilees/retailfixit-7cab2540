import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  ScrollText,
  Settings,
  Building2,
  UserCog,
  Users,
  BarChart3,
  Flag,
  FlaskConical,
  Shield,
  Activity,
  HeartPulse,
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
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth/context";

const operate = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Jobs", url: "/jobs", icon: ClipboardList },
  { title: "Vendors", url: "/vendors", icon: Building2 },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Assignments", url: "/assignments", icon: ShieldCheck },
];

const intelligence = [
  { title: "AI Insights", url: "/ai", icon: Sparkles },
  { title: "AI Evaluation", url: "/ai-eval", icon: FlaskConical },
  { title: "AI Governance", url: "/ai-governance", icon: Shield },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const admin = [
  { title: "Audit log", url: "/audit", icon: ScrollText },
  { title: "Users & roles", url: "/users", icon: UserCog },
  { title: "Roles & permissions", url: "/rbac", icon: ShieldCheck },
  { title: "Feature flags", url: "/feature-flags", icon: Flag },
  { title: "Observability", url: "/observability", icon: Activity },
  { title: "System health", url: "/health", icon: HeartPulse },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user } = useAuth();

  const isActive = (url: string) => path === url || path.startsWith(url + "/");

  const renderGroup = (label: string, items: typeof operate) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50 px-3">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                tooltip={item.title}
                className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium hover:bg-sidebar-accent/60 transition-colors h-9 rounded-lg"
              >
                <Link to={item.url} className="flex items-center gap-2.5">
                  <item.icon className="h-[18px] w-[18px]" />
                  <span className="text-[13px]">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border h-14 justify-center">
        <Link to="/dashboard" className="flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-primary-foreground font-semibold shadow-pop">
            R
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold tracking-tight text-sidebar-foreground">RetailFixIt</span>
              <span className="text-[10px] text-sidebar-foreground/50">Operations</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 py-2">
        {renderGroup("Operate", operate)}
        {renderGroup("Intelligence", intelligence)}
        {renderGroup("Administer", admin)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand text-primary-foreground text-[11px] font-medium shadow-pop">
            {(user?.name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
            <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-success border-2 border-sidebar" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight overflow-hidden min-w-0">
              <span className="truncate text-[12px] font-medium text-sidebar-foreground">{user?.name}</span>
              <span className="truncate text-[10px] text-sidebar-foreground/50 capitalize">{user?.roles[0]?.replace("_", " ")}</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
