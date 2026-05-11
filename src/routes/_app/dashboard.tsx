import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api/client";
import { MetricCard } from "@/components/common/MetricCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, BriefcaseBusiness, Clock, Sparkles, ArrowUpRight, Activity } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Cell } from "recharts";
import { StatusBadge, PriorityBadge, TimeAgo } from "@/components/common/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtime } from "@/hooks/use-realtime";
import { LiveDot } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const STATUS_HEX: Record<string, string> = {
  new: "#1A56DB",
  triaged: "#6366F1",
  assigned: "#0891B2",
  in_progress: "#F59E0B",
  on_hold: "#94A3B8",
  completed: "#16A34A",
  cancelled: "#64748B",
};

function Dashboard() {
  const qc = useQueryClient();
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: () => api.getDashboardMetrics() });
  const recent = useQuery({ queryKey: ["jobs", { page: 1, pageSize: 6 }], queryFn: () => api.listJobs({ page: 1, pageSize: 6 }) });
  const vendors = useQuery({ queryKey: ["vendors-top"], queryFn: () => api.listVendors({ pageSize: 5 }) });

  useRealtime(["job.created", "job.updated", "job.assigned"], () => {
    qc.invalidateQueries({ queryKey: ["metrics"] });
    qc.invalidateQueries({ queryKey: ["jobs"] });
  });

  const m = metrics.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Operations overview</h2>
            <LiveDot />
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">Live snapshot across all active vendors and jobs.</p>
        </div>
        <Button asChild size="sm" className="rounded-lg shadow-card"><Link to="/jobs">View all jobs <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></Link></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.isLoading || !m ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <MetricCard label="Open jobs" value={m.jobsOpen} icon={BriefcaseBusiness} hint={`${m.jobsAssignedToday} assigned today`} delta="+12%" trend="up" tone="primary" />
            <MetricCard label="SLA breaches" value={m.slaBreaches} icon={AlertTriangle} tone="destructive" hint="Past due, not closed" delta="-3" trend="down" />
            <MetricCard label="Avg assignment" value={`${m.avgAssignmentMinutes}m`} icon={Clock} hint="Created → assigned" delta="-2m" trend="down" tone="success" />
            <MetricCard label="AI override rate" value={`${Math.round(m.aiOverrideRate * 100)}%`} icon={Sparkles} tone="primary" hint="Dispatcher overrode AI" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 shadow-card rounded-2xl">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-1">
            <div>
              <CardTitle className="text-[15px] font-semibold tracking-tight">Job throughput</CardTitle>
              <CardDescription className="text-[12px]">Created vs completed · last 14 days</CardDescription>
            </div>
            <div className="flex gap-3 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Created</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />Completed</span>
            </div>
          </CardHeader>
          <CardContent className="h-72 pt-2">
            {m && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.jobsTrend} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A56DB" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#1A56DB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} width={32} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 255)", fontSize: 12, boxShadow: "var(--shadow-md)" }} />
                  <Area type="monotone" dataKey="created" stroke="#1A56DB" fill="url(#g1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="completed" stroke="#16A34A" fill="url(#g2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card rounded-2xl">
          <CardHeader className="pb-1">
            <CardTitle className="text-[15px] font-semibold tracking-tight">Jobs by status</CardTitle>
            <CardDescription className="text-[12px]">Current snapshot</CardDescription>
          </CardHeader>
          <CardContent className="h-72 pt-2">
            {m && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.jobsByStatus} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0 0 0 / 0.05)" />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="status" width={88} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(s) => s.replace("_", " ")} />
                  <Tooltip cursor={{ fill: "oklch(0 0 0 / 0.04)" }} contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 255)", fontSize: 12 }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
                    {m.jobsByStatus.map((s) => <Cell key={s.status} fill={STATUS_HEX[s.status] ?? "#1A56DB"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 shadow-card rounded-2xl">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-[15px] font-semibold tracking-tight">Recent jobs</CardTitle>
              <CardDescription className="text-[12px]">Most recently created</CardDescription>
            </div>
            <Link to="/jobs" className="text-[12px] font-medium text-primary hover:underline">View all →</Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border/60">
              {recent.data?.items.map((j) => (
                <Link
                  key={j.id}
                  to="/jobs/$jobId"
                  params={{ jobId: j.id }}
                  className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-lg hover:bg-accent/40 transition-colors group"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">{j.reference}</span>
                      <span className="text-[13px] text-muted-foreground truncate">{j.title}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{j.customerName} · {j.city}</div>
                  </div>
                  <PriorityBadge priority={j.priority} />
                  <StatusBadge status={j.status} />
                  <span className="hidden md:block text-[11px] text-muted-foreground w-16 text-right">
                    <TimeAgo iso={j.createdAt} />
                  </span>
                </Link>
              ))}
              {recent.isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 my-2" />)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-[15px] font-semibold tracking-tight">Top vendors</CardTitle>
            <CardDescription className="text-[12px]">By rating, available capacity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {vendors.data?.items.map((v) => (
              <Link key={v.id} to="/vendors/$vendorId" params={{ vendorId: v.id }} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-accent/40 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-brand text-primary-foreground flex items-center justify-center text-[11px] font-semibold shadow-pop">
                  {v.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{v.name}</div>
                  <div className="text-[11px] text-muted-foreground">★ {v.rating} · {v.activeJobs}/{v.capacity} active</div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
