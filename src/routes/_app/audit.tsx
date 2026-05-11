import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ScrollText, FileDown, GitCompare } from "lucide-react";
import { TimeAgo } from "@/components/common/badges";
import { TableSkeleton } from "@/components/common/Skeletons";
import { useRealtime } from "@/hooks/use-realtime";
import { PageHeader, EmptyState, LiveDot } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JsonDiff } from "@/components/common/JsonDiff";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuditLog } from "@/lib/types";

export const Route = createFileRoute("/_app/audit")({
  component: AuditPage,
});

function AuditPage() {
  const qc = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<AuditLog | null>(null);
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
                <TableHead className="text-[11px] uppercase tracking-wider">Correlation</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-right">Diff</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {audit.data.items.map((a) => {
                  const hasDiff = !!(a.before || a.after);
                  return (
                    <TableRow
                      key={a.id}
                      className="text-[13px] cursor-pointer hover:bg-bg-secondary/60"
                      onClick={() => setSelected(a)}
                    >
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap"><TimeAgo iso={a.createdAt} /></TableCell>
                      <TableCell>
                        <Badge variant={a.actorRole === "ai" ? "default" : "secondary"} className="text-[10px]">{a.actorRole}</Badge>
                        <span className="text-[11px] text-muted-foreground ml-2">{a.actor}</span>
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">{a.action}</TableCell>
                      <TableCell className="text-[12px]">{a.entityType} · <span className="font-mono text-[11px]">{a.entityId}</span></TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{a.correlationId ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {hasDiff ? <GitCompare className="h-3.5 w-3.5 text-primary inline" /> : <span className="text-[10px] text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-[14px]">{selected?.action}</DialogTitle>
            <DialogDescription className="text-[11px]">
              {selected && (
                <>
                  {selected.entityType} · <span className="font-mono">{selected.entityId}</span> · by <span className="font-mono">{selected.actor}</span> ({selected.actorRole}) · <TimeAgo iso={selected.createdAt} />
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <Tabs defaultValue="diff" className="mt-2">
              <TabsList>
                <TabsTrigger value="diff" className="text-[12px]">Diff</TabsTrigger>
                <TabsTrigger value="meta" className="text-[12px]">Metadata</TabsTrigger>
                <TabsTrigger value="raw" className="text-[12px]">Raw JSON</TabsTrigger>
              </TabsList>
              <TabsContent value="diff" className="mt-3">
                <JsonDiff before={selected.before} after={selected.after} />
              </TabsContent>
              <TabsContent value="meta" className="mt-3 space-y-2 text-[12px]">
                <Meta label="Correlation ID" value={selected.correlationId ?? "—"} />
                <Meta label="Trace ID" value={selected.traceId ?? "—"} />
                <Meta label="Tenant" value={selected.tenantId} />
                <pre className="mt-2 p-3 rounded-lg bg-bg-secondary text-[11px] overflow-auto max-h-64">{JSON.stringify(selected.metadata ?? {}, null, 2)}</pre>
              </TabsContent>
              <TabsContent value="raw" className="mt-3">
                <pre className="p-3 rounded-lg bg-bg-secondary text-[11px] overflow-auto max-h-96">{JSON.stringify(selected, null, 2)}</pre>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border/60 bg-bg-secondary/50">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-[11px] text-foreground truncate">{value}</span>
    </div>
  );
}
