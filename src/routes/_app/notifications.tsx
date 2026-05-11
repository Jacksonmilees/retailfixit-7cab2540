import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { TimeAgo } from "@/components/common/badges";
import { Bell, Sparkles, AlertTriangle, ClipboardList, Filter } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRealtime } from "@/hooks/use-realtime";
import { EmptyState } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const audit = useQuery({ queryKey: ["audit", "notifications"], queryFn: () => api.listAudit({ pageSize: 60 }) });
  useRealtime(["audit.appended", "ai.recommendation.ready", "job.assigned"], () => qc.invalidateQueries({ queryKey: ["audit", "notifications"] }));

  const items = audit.data?.items ?? [];
  const ai = items.filter((i) => i.action.startsWith("ai."));
  const sla = items.filter((i) => i.action.includes("status_changed") || i.action === "job.assigned");
  const all = items;

  const renderList = (list: typeof items) => (
    <div className="divide-y divide-border/60">
      {list.length === 0 ? (
        <EmptyState icon={Bell} title="All caught up" description="No notifications match this filter." />
      ) : list.slice(0, 30).map((n) => {
        const isAi = n.action.startsWith("ai.");
        const Icon = isAi ? Sparkles : n.action.includes("breach") ? AlertTriangle : ClipboardList;
        const tone = isAi ? "text-primary bg-primary/10" : "text-info bg-info/10";
        return (
          <div key={n.id} className="flex gap-3 p-4 hover:bg-accent/30 transition-colors">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-foreground">{n.action.replace(/\./g, " ")}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {n.actor} · {n.entityType} {n.entityId}
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground whitespace-nowrap"><TimeAgo iso={n.createdAt} /></div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card className="border-border/60 shadow-card rounded-2xl overflow-hidden">
      <Tabs defaultValue="all">
        <CardContent className="p-3 border-b border-border/60 flex items-center justify-between">
          <TabsList className="bg-bg-tertiary">
            <TabsTrigger value="all" className="text-[12px]">All <span className="ml-1.5 text-muted-foreground">{all.length}</span></TabsTrigger>
            <TabsTrigger value="ai" className="text-[12px]">AI <span className="ml-1.5 text-muted-foreground">{ai.length}</span></TabsTrigger>
            <TabsTrigger value="sla" className="text-[12px]">Operations <span className="ml-1.5 text-muted-foreground">{sla.length}</span></TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="sm" className="text-[12px]"><Filter className="h-3.5 w-3.5 mr-1.5" />Filter</Button>
        </CardContent>
        <TabsContent value="all" className="m-0">{audit.isLoading ? <Skeleton className="h-64 m-4" /> : renderList(all)}</TabsContent>
        <TabsContent value="ai" className="m-0">{renderList(ai)}</TabsContent>
        <TabsContent value="sla" className="m-0">{renderList(sla)}</TabsContent>
      </Tabs>
    </Card>
  );
}
