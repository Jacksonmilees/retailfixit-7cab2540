import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, ClipboardList, Building2, Users, ShieldCheck, Sparkles, FlaskConical,
  BarChart3, ScrollText, UserCog, Flag, Settings, Shield, Activity, HeartPulse, Bell,
} from "lucide-react";

const NAV: { label: string; to: string; icon: typeof LayoutDashboard; group: string }[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, group: "Operate" },
  { label: "Jobs", to: "/jobs", icon: ClipboardList, group: "Operate" },
  { label: "Vendors", to: "/vendors", icon: Building2, group: "Operate" },
  { label: "Customers", to: "/customers", icon: Users, group: "Operate" },
  { label: "Assignments", to: "/assignments", icon: ShieldCheck, group: "Operate" },
  { label: "AI Insights", to: "/ai", icon: Sparkles, group: "Intelligence" },
  { label: "AI Evaluation", to: "/ai-eval", icon: FlaskConical, group: "Intelligence" },
  { label: "AI Governance", to: "/ai-governance", icon: Shield, group: "Intelligence" },
  { label: "Reports", to: "/reports", icon: BarChart3, group: "Intelligence" },
  { label: "Audit log", to: "/audit", icon: ScrollText, group: "Administer" },
  { label: "Users", to: "/users", icon: UserCog, group: "Administer" },
  { label: "Roles & permissions", to: "/rbac", icon: ShieldCheck, group: "Administer" },
  { label: "Feature flags", to: "/feature-flags", icon: Flag, group: "Administer" },
  { label: "Observability", to: "/observability", icon: Activity, group: "Administer" },
  { label: "System health", to: "/health", icon: HeartPulse, group: "Administer" },
  { label: "Notifications", to: "/notifications", icon: Bell, group: "Administer" },
  { label: "Settings", to: "/settings", icon: Settings, group: "Administer" },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = React.useMemo(() => {
    const g: Record<string, typeof NAV> = {};
    NAV.forEach(n => { (g[n.group] ||= []).push(n); });
    return g;
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search jobs, vendors, pages…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        {Object.entries(groups).map(([group, items], i) => (
          <React.Fragment key={group}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map(item => (
                <CommandItem
                  key={item.to}
                  value={`${group} ${item.label}`}
                  onSelect={() => { setOpen(false); navigate({ to: item.to }); }}
                >
                  <item.icon className="h-3.5 w-3.5 mr-2" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
