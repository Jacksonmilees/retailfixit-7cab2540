import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api/client";
import { MetricCard } from "@/components/common/MetricCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, AlertTriangle, BriefcaseBusiness, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { StatusBadge, TimeAgo } from "@/components/common/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtime } from "@/hooks/use-realtime";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const STATUS_COLORS = ["#1A56DB", "#2563EB", "#16A34A", "#F59E0B", "#94A3B8", "#DC2626", "#64748B"];

function Dashboard() {
  const qc = useQueryClient();
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: () => api.getDashboardMetrics() });
  const recent = useQuery({ queryKey: ["jobs", { page: 1, pageSize: 6 }], queryFn: () => api.listJobs({ page: 1, pageSize: 6 }) });

  useRealtime(["job.created", "job.updated", "job.assigned"], () => {
    qc.invalidateQueries({ queryKey: ["metrics"] });
    qc.invalidateQueries({ queryKey: ["jobs"] });
  });

  const m = metrics.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.isLoading || !m ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <MetricCard label="Open jobs" value={m.jobsOpen} icon={BriefcaseBusiness} hint={`${m.jobsAssignedToday} assigned today`} />
            <MetricCard label="SLA breaches" value={m.slaBreaches} icon={AlertTriangle} tone="destructive" hint="Past due, not closed" />
            <MetricCard label="Avg assignment" value={`${m.avgAssignmentMinutes}m`} icon={Clock} hint="Created → assigned" />
            <MetricCard label="AI override rate" value={`${Math.round(m.aiOverrideRate * 100)}%`} icon={Sparkles} tone="primary" hint="Dispatcher overrode AI" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Job throughput · last 14 days</CardTitle>
            <CardDescription>Created vs completed</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {m && (
              <ChartContainer
                config={{ created: { label: "Created", color: "var(--color-primary)" }, completed: { label: "Completed", color: "var(--color-success)" } }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={m.jobsTrend}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1A56DB" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#1A56DB" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="date" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                    <YAxis fontSize={11} width={28} />
                    <Tooltip />
                    <Area type="monotone" dataKey="created" stroke="#1A56DB" fill="url(#g1)" strokeWidth={2} />
                    <Area type="monotone" dataKey="completed" stroke="#16A34A" fill="url(#g2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jobs by status</CardTitle>
            <CardDescription>Current snapshot</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {m && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.jobsByStatus} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="status" width={90} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {m.jobsByStatus.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Recent jobs</CardTitle>
            <CardDescription>Most recently created</CardDescription>
          </div>
          <Link to="/jobs" className="text-sm text-primary hover:underline">View all →</Link>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {recent.data?.items.map((j) => (
              <Link
                key={j.id}
                to="/jobs/$jobId"
                params={{ jobId: j.id }}
                className="flex items-center gap-4 py-3 hover:bg-accent/50 -mx-2 px-2 rounded transition-colors"
              >
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{j.reference}</span>
                    <span className="text-sm text-muted-foreground truncate">{j.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{j.customerName} · {j.city}</div>
                </div>
                <StatusBadge status={j.status} />
                <span className="hidden sm:block text-xs text-muted-foreground w-20 text-right">
                  <TimeAgo iso={j.createdAt} />
                </span>
              </Link>
            ))}
            {recent.isLoading && <Skeleton className="h-32" />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

void CheckCircle2;
