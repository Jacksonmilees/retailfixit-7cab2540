import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/common/PageHeader";
import { ShieldCheck, Check, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/context";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/_app/rbac")({ component: RbacPage });

const roles: Role[] = ["admin", "dispatcher", "vendor_manager", "support"];

const matrix: { resource: string; perms: { name: string; roles: Role[] }[] }[] = [
  { resource: "Jobs", perms: [
    { name: "View", roles: ["admin", "dispatcher", "vendor_manager", "support"] },
    { name: "Create", roles: ["admin", "dispatcher", "support"] },
    { name: "Update", roles: ["admin", "dispatcher"] },
    { name: "Assign vendor", roles: ["admin", "dispatcher"] },
    { name: "Cancel", roles: ["admin"] },
  ]},
  { resource: "Vendors", perms: [
    { name: "View", roles: ["admin", "dispatcher", "vendor_manager", "support"] },
    { name: "Create", roles: ["admin", "vendor_manager"] },
    { name: "Suspend", roles: ["admin", "vendor_manager"] },
    { name: "Set capacity", roles: ["admin", "vendor_manager"] },
  ]},
  { resource: "AI", perms: [
    { name: "View recommendations", roles: ["admin", "dispatcher", "vendor_manager"] },
    { name: "Apply recommendation", roles: ["admin", "dispatcher"] },
    { name: "Override AI", roles: ["admin", "dispatcher"] },
    { name: "Promote prompt version", roles: ["admin"] },
    { name: "Engage kill-switch", roles: ["admin"] },
  ]},
  { resource: "Tenants", perms: [
    { name: "Switch tenant", roles: ["admin"] },
    { name: "Manage users", roles: ["admin"] },
    { name: "Manage feature flags", roles: ["admin"] },
  ]},
  { resource: "Audit", perms: [
    { name: "View audit log", roles: ["admin", "dispatcher", "vendor_manager", "support"] },
    { name: "Export audit log", roles: ["admin"] },
  ]},
];

function RbacPage() {
  const { user } = useAuth();
  const myRoles = new Set(user?.roles ?? []);
  return (
    <div className="space-y-5">
      <PageHeader title="Roles & permissions" description="Effective permission matrix enforced by Entra ID claims and server-side policies" icon={ShieldCheck} actions={
        <div className="flex flex-wrap gap-1">
          {Array.from(myRoles).map(r => <Badge key={r} variant="default" className="capitalize text-[10px]">{r.replace("_", " ")}</Badge>)}
        </div>
      } />

      <SectionCard title="Permission matrix" description="✓ = allowed; highlighted column = your effective role">
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Resource / permission</th>
                {roles.map(r => (
                  <th key={r} className={`px-3 py-2 text-center font-medium capitalize ${myRoles.has(r) ? "text-primary" : ""}`}>{r.replace("_", " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map(group => (
                <React.Fragment key={group.resource}>
                  <tr className="bg-bg-tertiary/40"><td colSpan={roles.length + 1} className="py-1.5 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{group.resource}</td></tr>
                  {group.perms.map(p => (
                    <tr key={p.name} className="border-b border-border/40">
                      <td className="py-2 pr-3">{p.name}</td>
                      {roles.map(r => (
                        <td key={r} className={`px-3 py-2 text-center ${myRoles.has(r) ? "bg-primary/5" : ""}`}>
                          {p.roles.includes(r)
                            ? <Check className={`h-3.5 w-3.5 inline ${myRoles.has(r) ? "text-primary" : "text-success"}`} />
                            : <Minus className="h-3.5 w-3.5 inline text-muted-foreground/40" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Tenant isolation" description="Every query is scoped server-side by tenantId derived from the bearer token claim">
        <ul className="space-y-2 text-[13px]">
          <li className="flex items-center justify-between"><span>Row-level filter on tenantId</span><Badge>Enforced</Badge></li>
          <li className="flex items-center justify-between"><span>Per-tenant Service Bus subscription topic prefix</span><Badge>Enforced</Badge></li>
          <li className="flex items-center justify-between"><span>SignalR groups: <code className="font-mono text-[11px]">tenant:{`{id}`}</code></span><Badge>Enforced</Badge></li>
          <li className="flex items-center justify-between"><span>Storage containers partitioned by tenant</span><Badge>Enforced</Badge></li>
        </ul>
      </SectionCard>
    </div>
  );
}
