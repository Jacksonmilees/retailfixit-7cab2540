import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TimeAgo } from "@/components/common/badges";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/assignments")({
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const all = useQuery({ queryKey: ["assignments"], queryFn: () => api.listAssignments({ pageSize: 100 }) });
  const vendors = useQuery({ queryKey: ["vendors-all"], queryFn: () => api.listVendors({ pageSize: 100 }) });
  const jobs = useQuery({ queryKey: ["jobs-all"], queryFn: () => api.listJobs({ pageSize: 200 }) });

  if (all.isLoading) return <Skeleton className="h-96" />;
  const vmap = new Map((vendors.data?.items ?? []).map((v) => [v.id, v]));
  const jmap = new Map((jobs.data?.items ?? []).map((j) => [j.id, j]));

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Assigned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {all.data?.items.map((a) => {
              const j = jmap.get(a.jobId);
              const v = vmap.get(a.vendorId);
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    {j ? (
                      <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="text-primary hover:underline">{j.reference}</Link>
                    ) : a.jobId}
                    <div className="text-xs text-muted-foreground truncate max-w-[260px]">{j?.title}</div>
                  </TableCell>
                  <TableCell>{v?.name ?? a.vendorId}</TableCell>
                  <TableCell><Badge variant={a.assignedBy === "ai" ? "default" : "secondary"}>{a.assignedBy === "ai" ? "AI" : "Human"}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground"><TimeAgo iso={a.assignedAt} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
