import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/common/MetricCard";
import { Sparkles, AlertCircle, Clock, Target } from "lucide-react";
import { TimeAgo } from "@/components/common/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/ai")({
  component: AIPage,
});

function AIPage() {
  const jobs = useQuery({ queryKey: ["jobs-all"], queryFn: () => api.listJobs({ pageSize: 200 }) });
  // We don't have a direct list endpoint for recs; build from jobs+getRecommendation cache.
  // For demo, derive aggregated stats from the metrics endpoint and show recent jobs with AI fields.

  const metrics = useQuery({ queryKey: ["metrics"], queryFn: () => api.getDashboardMetrics() });

  if (metrics.isLoading || !metrics.data) return <Skeleton className="h-96" />;
  const m = metrics.data;
  const aiJobs = (jobs.data?.items ?? []).filter((j) => j.aiSummary).slice(0, 12);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="AI override rate" value={`${Math.round(m.aiOverrideRate * 100)}%`} icon={Sparkles} tone="primary" hint="Last 30 days" />
        <MetricCard label="Avg latency" value="640ms" icon={Clock} hint="p50 across recommendations" />
        <MetricCard label="Fallbacks used" value="6%" icon={AlertCircle} tone="warning" hint="Timeout or low confidence" />
        <MetricCard label="Avg confidence" value="78%" icon={Target} hint="Top candidate score" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI-summarized jobs</CardTitle>
          <CardDescription>Generated from raw customer reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiJobs.map((j) => (
            <Link key={j.id} to="/jobs/$jobId" params={{ jobId: j.id }} className="block rounded-md border border-border p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary">{j.reference}</span>
                  <span className="text-sm">{j.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{j.category}</Badge>
                  <span className="text-xs text-muted-foreground"><TimeAgo iso={j.createdAt} /></span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{j.aiSummary}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
