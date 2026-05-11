import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Star, MapPin, Phone, Mail, Activity, CheckCircle2, Pause } from "lucide-react";
import { MetricCard } from "@/components/common/MetricCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, TimeAgo } from "@/components/common/badges";

export const Route = createFileRoute("/_app/vendors/$vendorId")({
  component: VendorDetail,
});

function VendorDetail() {
  const { vendorId } = Route.useParams();
  const v = useQuery({ queryKey: ["vendor", vendorId], queryFn: () => api.getVendor(vendorId) });
  const assignments = useQuery({ queryKey: ["vendor-assignments", vendorId], queryFn: () => api.listAssignments({ vendorId, pageSize: 50 }) });
  const jobs = useQuery({ queryKey: ["jobs-all"], queryFn: () => api.listJobs({ pageSize: 200 }) });

  if (v.isLoading || !v.data) return <Skeleton className="h-96 rounded-2xl" />;
  const vendor = v.data;
  const jmap = new Map((jobs.data?.items ?? []).map((j) => [j.id, j]));

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2"><Link to="/vendors"><ChevronLeft className="h-4 w-4 mr-1" />All vendors</Link></Button>

      <Card className="border-border/60 shadow-card rounded-2xl overflow-hidden">
        <div className="h-24 bg-brand opacity-90 relative">
          <div className="absolute inset-0 bg-mesh opacity-40" />
        </div>
        <CardContent className="-mt-10 relative">
          <div className="flex items-end gap-4">
            <div className="h-20 w-20 rounded-2xl bg-card border-4 border-card shadow-pop flex items-center justify-center text-xl font-semibold text-primary">
              {vendor.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{vendor.name}</h1>
                <Badge variant="outline" className={vendor.status === "active" ? "border-success/40 text-success" : "border-warning/40"}>
                  {vendor.status === "active" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                  {vendor.status}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground mt-1">
                <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{vendor.email}</span>
                <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{vendor.phone}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{vendor.regions.join(", ")}</span>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end pb-1">
              <div className="flex items-center gap-1 text-warning"><Star className="h-4 w-4 fill-warning" /><span className="text-lg font-semibold text-foreground">{vendor.rating}</span></div>
              <div className="text-[11px] text-muted-foreground">{vendor.completedJobs} completed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active jobs" value={`${vendor.activeJobs}/${vendor.capacity}`} icon={Activity} tone="primary" />
        <MetricCard label="Completed" value={vendor.completedJobs} icon={CheckCircle2} tone="success" />
        <MetricCard label="Avg response" value={`${vendor.avgResponseMinutes}m`} hint="To accept assignment" />
        <MetricCard label="Rating" value={vendor.rating} hint={`${vendor.completedJobs} reviews`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-card rounded-2xl lg:col-span-2">
          <CardHeader><CardTitle className="text-[15px]">Recent assignments</CardTitle><CardDescription className="text-[12px]">Last 10 jobs dispatched</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead><TableHead className="text-right">Assigned</TableHead></TableRow></TableHeader>
              <TableBody>
                {assignments.data?.items.slice(0, 10).map((a) => {
                  const j = jmap.get(a.jobId);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        {j ? <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="text-primary hover:underline">{j.reference}</Link> : a.jobId}
                        <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{j?.title}</div>
                      </TableCell>
                      <TableCell>{j && <StatusBadge status={j.status} />}</TableCell>
                      <TableCell><Badge variant={a.assignedBy === "ai" ? "default" : "secondary"} className="text-[10px]">{a.assignedBy === "ai" ? "AI" : "Human"}</Badge></TableCell>
                      <TableCell className="text-right text-[11px] text-muted-foreground"><TimeAgo iso={a.assignedAt} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card rounded-2xl">
          <CardHeader><CardTitle className="text-[15px]">Capabilities</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Categories</div>
              <div className="flex flex-wrap gap-1.5">{vendor.categories.map((c) => <Badge key={c} variant="secondary" className="text-[11px]">{c}</Badge>)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Regions</div>
              <div className="flex flex-wrap gap-1.5">{vendor.regions.map((r) => <Badge key={r} variant="outline" className="text-[11px]">{r}</Badge>)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
