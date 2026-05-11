import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { TimeAgo } from "@/components/common/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtime } from "@/hooks/use-realtime";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/audit")({
  component: AuditPage,
});

function AuditPage() {
  const qc = useQueryClient();
  const [search, setSearch] = React.useState("");
  const audit = useQuery({ queryKey: ["audit", search], queryFn: () => api.listAudit({ search, pageSize: 100 }) });
  useRealtime(["audit.appended"], () => qc.invalidateQueries({ queryKey: ["audit"] }));

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search action or entity…" className="pl-8" />
        </div>
      </CardContent></Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Time</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Metadata</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {audit.isLoading && <TableRow><TableCell colSpan={5}><Skeleton className="h-24" /></TableCell></TableRow>}
              {audit.data?.items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap"><TimeAgo iso={a.createdAt} /></TableCell>
                  <TableCell><Badge variant={a.actorRole === "ai" ? "default" : "secondary"}>{a.actorRole}</Badge> <span className="text-xs text-muted-foreground ml-2">{a.actor}</span></TableCell>
                  <TableCell className="font-mono text-xs">{a.action}</TableCell>
                  <TableCell className="text-xs">{a.entityType} · {a.entityId}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground max-w-[280px] truncate">{JSON.stringify(a.metadata ?? {})}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
