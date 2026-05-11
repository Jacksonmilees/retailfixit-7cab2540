import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ScrollText, FileDown } from "lucide-react";
import { TimeAgo } from "@/components/common/badges";
import { TableSkeleton } from "@/components/common/Skeletons";
import { useRealtime } from "@/hooks/use-realtime";
import { PageHeader, EmptyState, LiveDot } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/audit")({
  component: AuditPage,
});

function AuditPage() {
  const qc = useQueryClient();
  const [search, setSearch] = React.useState("");
  const audit = useQuery({ queryKey: ["audit", search], queryFn: () => api.listAudit({ search, pageSize: 100 }) });
  useRealtime(["audit.appended"], () => qc.invalidateQueries({ queryKey: ["audit"] }));

  function exportCsv() {
    const rows = audit.data?.items ?? [];
    const csv = ["time,actor,role,action,entity_type,entity_id,metadata"]
      .concat(rows.map(r => [r.createdAt, r.actor, r.actorRole ?? "", r.action, r.entityType, r.entityId, JSON.stringify(r.metadata ?? {}).replace(/,/g, ";")].join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        description="Tamper-evident record of every action across the platform."
        icon={ScrollText}
        actions={<><LiveDot /><Button size="sm" variant="outline" className="rounded-lg" onClick={exportCsv}><FileDown className="h-3.5 w-3.5 mr-1.5" />Export CSV</Button></>}
      />

      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search action or entity…" className="pl-8 rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {audit.isLoading ? (
        <TableSkeleton rows={10} cols={5} />
      ) : !audit.data?.items.length ? (
        <Card className="border-border/60 shadow-card rounded-2xl"><CardContent>
          <EmptyState icon={ScrollText} title="No audit events" description="Try a different search term, or wait for new activity." />
        </CardContent></Card>
      ) : (
        <Card className="border-border/60 shadow-card rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider">Time</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Actor</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Action</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Entity</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Metadata</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {audit.data.items.map((a) => (
                  <TableRow key={a.id} className="text-[13px]">
                    <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap"><TimeAgo iso={a.createdAt} /></TableCell>
                    <TableCell>
                      <Badge variant={a.actorRole === "ai" ? "default" : "secondary"} className="text-[10px]">{a.actorRole}</Badge>
                      <span className="text-[11px] text-muted-foreground ml-2">{a.actor}</span>
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">{a.action}</TableCell>
                    <TableCell className="text-[12px]">{a.entityType} · <span className="font-mono text-[11px]">{a.entityId}</span></TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground max-w-[280px] truncate">{JSON.stringify(a.metadata ?? {})}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
