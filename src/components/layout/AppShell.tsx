import * as React from "react";
import { Outlet, useRouter, useRouterState, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, LogOut, Search, ChevronDown, Building2, Settings as SettingsIcon, User, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { useRealtime } from "@/hooks/use-realtime";
import { useSignalRContext } from "@/lib/realtime/SignalRProvider";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CommandPalette } from "@/components/common/CommandPalette";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Live operations overview" },
  "/jobs": { title: "Jobs", subtitle: "All service requests" },
  "/vendors": { title: "Vendors", subtitle: "Network directory" },
  "/customers": { title: "Customers", subtitle: "Accounts and locations" },
  "/assignments": { title: "Assignments", subtitle: "Active dispatches" },
  "/notifications": { title: "Notifications", subtitle: "System and AI alerts" },
  "/ai": { title: "AI Insights", subtitle: "Recommendation performance" },
  "/ai-eval": { title: "AI Evaluation", subtitle: "Offline test harness" },
  "/ai-governance": { title: "AI Governance", subtitle: "Model, prompts, and safety controls" },
  "/reports": { title: "Reports", subtitle: "Operational analytics" },
  "/audit": { title: "Audit log", subtitle: "Append-only history" },
  "/users": { title: "Users & roles", subtitle: "Access management" },
  "/rbac": { title: "Roles & permissions", subtitle: "Effective permission matrix" },
  "/feature-flags": { title: "Feature flags", subtitle: "Rollout controls" },
  "/observability": { title: "Observability", subtitle: "Traces, metrics, event lag" },
  "/health": { title: "System health", subtitle: "Dependencies and circuit breakers" },
  "/settings": { title: "Settings", subtitle: "Tenant and AI controls" },
};

export function AppShell() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, logout } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = React.useState(3);
  const { isConnected } = useSignalRContext();

  useRealtime(["job.assigned", "ai.recommendation.ready", "job.created"], (e) => {
    setUnread((u) => u + 1);
    if (e.type === "ai.recommendation.ready") toast.success("AI recommendation ready", { description: "New candidate vendors available" });
    if (e.type === "job.assigned") toast.message("Job assigned", { description: "A vendor was just assigned." });
    if (e.type === "job.created") toast.info("New job created");
  });

  const meta = React.useMemo(() => {
    const seg = "/" + (path.split("/")[1] ?? "");
    return TITLES[seg] ?? { title: "RetailFixIt" };
  }, [path]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-bg-secondary">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border glass px-4 md:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-col leading-tight min-w-0">
              <h1 className="text-[14px] font-semibold tracking-tight text-foreground truncate">{meta.title}</h1>
              {meta.subtitle && <p className="text-[11px] text-muted-foreground truncate hidden sm:block">{meta.subtitle}</p>}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              {/* Real-time connection status */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${isConnected ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      <span className="hidden sm:inline">{isConnected ? 'Live' : 'Offline'}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isConnected ? 'Real-time updates connected' : 'Real-time updates disconnected'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search…"
                  className="w-64 pl-9 h-9 bg-bg-secondary/60 border-border/60 rounded-lg text-[13px] focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-1.5 text-[13px] h-9 rounded-lg">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>RetailFixIt</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">Tenants</DropdownMenuLabel>
                  <DropdownMenuItem className="text-[13px]"><Building2 className="h-3.5 w-3.5 mr-2" />RetailFixIt <Badge variant="secondary" className="ml-auto text-[10px]">Active</Badge></DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-[13px]"><Building2 className="h-3.5 w-3.5 mr-2 opacity-40" />Northwind Retail</DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-[13px]"><Building2 className="h-3.5 w-3.5 mr-2 opacity-40" />Acme Stores</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to="/notifications" onClick={() => setUnread(0)}>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-medium text-destructive-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 pl-1 pr-2 h-9 rounded-lg">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-primary-foreground text-[11px] font-medium shadow-pop">
                      {(user?.name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm">{user?.name}</span>
                      <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="text-[13px]"><Link to="/users"><User className="h-3.5 w-3.5 mr-2" />Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-[13px]"><Link to="/settings"><SettingsIcon className="h-3.5 w-3.5 mr-2" />Settings</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await logout(); router.navigate({ to: "/login" }); }} className="text-[13px]">
                    <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main key={path} className="flex-1 p-5 md:p-7 max-w-[1500px] w-full mx-auto animate-fade-up">
            <Outlet />
          </main>
        </div>
        <Toaster richColors position="top-right" />
        <CommandPalette />
      </div>
    </SidebarProvider>
  );
}
