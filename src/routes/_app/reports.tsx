import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MetricCard } from "@/components/common/MetricCard";
import { Download, TrendingUp, DollarSign, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

const COLORS = ["#1A56DB", "#16A34A", "#F59E0B", "#DC2626", "#6366F1", "#0891B2", "#94A3B8"];

function ReportsPage() {
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: () => api.getDashboardMetrics() });
  const jobs = useQuery({ queryKey: ["jobs-all"], queryFn: () => api.listJobs({ pageSize: 500 }) });

  if (metrics.isLoading || !metrics.data) return <Skeleton className="h-96 rounded-2xl" />;
  const m = metrics.data;
  const revenue = (jobs.data?.items ?? []).reduce((s, j) => s + j.estimatedValue, 0);
  const byCategory = Object.entries(
    (jobs.data?.items ?? []).reduce<Record<string, number>>((acc, j) => { acc[j.category] = (acc[j.category] ?? 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" className="rounded-lg"><Download className="h-3.5 w-3.5 mr-1.5" />Export CSV</Button>
        <Button size="sm" className="rounded-lg"><Download className="h-3.5 w-3.5 mr-1.5" />PDF report</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total revenue" value={`$${(revenue / 1000).toFixed(1)}k`} icon={DollarSign} tone="success" delta="+18%" trend="up" hint="Estimated, last 30d" />
        <MetricCard label="Avg job value" value={`$${Math.round(revenue / Math.max(1, jobs.data?.items.length ?? 1))}`} icon={TrendingUp} hint="Per dispatch" />
        <MetricCard label="Avg cycle time" value="3.4d" icon={Clock} tone="primary" hint="Created → completed" />
        <MetricCard label="CSAT" value="4.6" icon={Star} tone="warning" hint="From 1.2k reviews" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 shadow-card rounded-2xl">
          <CardHeader><CardTitle className="text-[15px]">Revenue trend</CardTitle><CardDescription className="text-[12px]">Estimated job value over time</CardDescription></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.jobsTrend.map((d, i) => ({ ...d, revenue: 1500 + d.completed * 380 + i * 80 }))} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.05)" vertical={false} />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 255)", fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#16A34A" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card rounded-2xl">
          <CardHeader><CardTitle className="text-[15px]">Jobs by category</CardTitle><CardDescription className="text-[12px]">Distribution</CardDescription></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 255)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardHeader><CardTitle className="text-[15px]">Status distribution</CardTitle><CardDescription className="text-[12px]">Across all jobs</CardDescription></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={m.jobsByStatus} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.05)" vertical={false} />
              <XAxis dataKey="status" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(s) => s.replace("_", " ")} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.008 255)", fontSize: 12 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {m.jobsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
