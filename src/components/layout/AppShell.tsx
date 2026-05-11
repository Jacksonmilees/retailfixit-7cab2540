import * as React from "react";
import { Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, LogOut, Search } from "lucide-react";
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
import { toast } from "sonner";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/jobs": "Jobs",
  "/vendors": "Vendors",
  "/assignments": "Assignments",
  "/ai": "AI Insights",
  "/audit": "Audit log",
  "/users": "Users & roles",
  "/settings": "Settings",
};

export function AppShell() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, logout } = useAuth();
  const router = useRouter();

  useRealtime(["job.assigned", "ai.recommendation.ready"], (e) => {
    if (e.type === "ai.recommendation.ready") toast.success("AI recommendation ready");
    if (e.type === "job.assigned") toast.message("Job assigned", { description: "A vendor was just assigned." });
  });

  const title = React.useMemo(() => {
    const seg = "/" + (path.split("/")[1] ?? "");
    return TITLES[seg] ?? TITLES["/"];
  }, [path]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-bg-secondary">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur px-3 md:px-5">
            <SidebarTrigger />
            <h1 className="text-sm font-semibold text-foreground">{title}</h1>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search jobs, vendors…" className="w-64 pl-8 h-9 bg-bg-secondary" />
              </div>
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {(user?.name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </span>
                    <span className="hidden sm:inline text-sm">{user?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm">{user?.name}</span>
                      <span className="text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await logout(); router.navigate({ to: "/login" }); }}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    </SidebarProvider>
  );
}
