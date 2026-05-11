import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/common/MetricCard";
import { Sparkles, AlertCircle, Clock, Target, Brain } from "lucide-react";
import { TimeAgo } from "@/components/common/badges";
import { Badge } from "@/components/ui/badge";
import { MetricsRowSkeleton, ListSkeleton } from "@/components/common/Skeletons";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";

export const Route = createFileRoute("/_app/ai")({
  component: AIPage,
});

function AIPage() {
  const jobs = useQuery({ queryKey: ["jobs-all"], queryFn: () => api.listJobs({ pageSize: 200 }) });
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: () => api.getDashboardMetrics() });

  const aiJobs = (jobs.data?.items ?? []).filter((j) => j.aiSummary).slice(0, 12);

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI insights"
        description="Live signals from Azure OpenAI dispatch and summarization."
        icon={Brain}
      />

      {metrics.isLoading || !metrics.data ? (
        <MetricsRowSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="AI override rate" value={`${Math.round(metrics.data.aiOverrideRate * 100)}%`} icon={Sparkles} tone="primary" hint="Last 30 days" />
          <MetricCard label="Avg latency" value="640ms" icon={Clock} hint="p50 across recommendations" />
          <MetricCard label="Fallbacks used" value="6%" icon={AlertCircle} tone="warning" hint="Timeout or low confidence" />
          <MetricCard label="Avg confidence" value="78%" icon={Target} tone="success" hint="Top candidate score" />
        </div>
      )}

      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-[15px] font-semibold tracking-tight">AI-summarized jobs</CardTitle>
          <CardDescription className="text-[12px]">Generated from raw customer reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobs.isLoading ? <ListSkeleton rows={6} /> : !aiJobs.length ? (
            <EmptyState icon={Sparkles} title="No AI summaries yet" description="Generate a summary from any job's detail page." />
          ) : aiJobs.map((j) => (
            <Link key={j.id} to="/jobs/$jobId" params={{ jobId: j.id }} className="block rounded-xl border border-border/60 p-4 hover:bg-bg-secondary hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[11px] text-primary">{j.reference}</span>
                  <span className="text-[13px] font-medium truncate">{j.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{j.category}</Badge>
                  <span className="text-[11px] text-muted-foreground"><TimeAgo iso={j.createdAt} /></span>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">{j.aiSummary}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
