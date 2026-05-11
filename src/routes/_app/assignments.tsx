import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TimeAgo } from "@/components/common/badges";
import { TableSkeleton } from "@/components/common/Skeletons";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { ArrowRightLeft, Sparkles, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_app/assignments")({
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const all = useQuery({ queryKey: ["assignments"], queryFn: () => api.listAssignments({ pageSize: 100 }) });
  const vendors = useQuery({ queryKey: ["vendors-all"], queryFn: () => api.listVendors({ pageSize: 100 }) });
  const jobs = useQuery({ queryKey: ["jobs-all"], queryFn: () => api.listJobs({ pageSize: 200 }) });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assignments"
        description="Every dispatch — AI-driven and manual — with full provenance."
        icon={ArrowRightLeft}
      />

      {all.isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : !all.data?.items.length ? (
        <Card className="border-border/60 shadow-card rounded-2xl">
          <CardContent>
            <EmptyState icon={ArrowRightLeft} title="No assignments yet" description="Dispatched vendors will appear here as soon as the first job is assigned." />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-card rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wider">Job</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Vendor</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Source</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider">Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.data.items.map((a) => {
                  const vmap = new Map((vendors.data?.items ?? []).map((v) => [v.id, v]));
                  const jmap = new Map((jobs.data?.items ?? []).map((j) => [j.id, j]));
                  const j = jmap.get(a.jobId);
                  const v = vmap.get(a.vendorId);
                  return (
                    <TableRow key={a.id} className="text-[13px]">
                      <TableCell>
                        {j ? (
                          <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="font-mono text-[12px] text-primary hover:underline">{j.reference}</Link>
                        ) : <span className="font-mono text-[12px]">{a.jobId}</span>}
                        <div className="text-[11px] text-muted-foreground truncate max-w-[260px] mt-0.5">{j?.title}</div>
                      </TableCell>
                      <TableCell>
                        {v ? (
                          <Link to="/vendors/$vendorId" params={{ vendorId: v.id }} className="hover:text-primary transition-colors">{v.name}</Link>
                        ) : a.vendorId}
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.assignedBy === "ai" ? "default" : "secondary"} className="text-[10px] gap-1">
                          {a.assignedBy === "ai" ? <Sparkles className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                          {a.assignedBy === "ai" ? "AI" : "Human"}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{a.status}</Badge></TableCell>
                      <TableCell className="text-right text-[11px] text-muted-foreground"><TimeAgo iso={a.assignedAt} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
