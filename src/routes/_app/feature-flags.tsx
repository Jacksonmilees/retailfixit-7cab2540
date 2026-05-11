import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Flag } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/feature-flags")({
  component: FlagsPage,
});

interface Flag { key: string; name: string; description: string; enabled: boolean; rollout: number; env: "all" | "staging" | "prod" }

function FlagsPage() {
  const [flags, setFlags] = React.useState<Flag[]>([
    { key: "ai.auto_assign", name: "AI auto-assign", description: "Skip dispatcher review when AI confidence ≥ 0.9.", enabled: false, rollout: 10, env: "staging" },
    { key: "ai.summary", name: "AI job summary", description: "Generate summary from raw customer reports.", enabled: true, rollout: 100, env: "all" },
    { key: "ai.reranker_b", name: "Reranker model B", description: "Use new reranker for vendor recommendations.", enabled: true, rollout: 50, env: "all" },
    { key: "ui.bulk_actions", name: "Bulk job actions", description: "Multi-select on jobs list.", enabled: false, rollout: 0, env: "staging" },
    { key: "ui.dark_mode", name: "Dark mode", description: "Allow operators to opt into dark theme.", enabled: true, rollout: 100, env: "all" },
    { key: "ops.sla_alerts", name: "Proactive SLA alerts", description: "Pre-breach push alerts to dispatchers.", enabled: true, rollout: 80, env: "prod" },
  ]);

  const update = (key: string, patch: Partial<Flag>) => {
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
    toast.success("Flag updated", { description: key });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" className="rounded-lg"><Plus className="h-4 w-4 mr-1.5" />New flag</Button>
      </div>
      <div className="grid gap-3">
        {flags.map((f) => (
          <Card key={f.key} className="border-border/60 shadow-card rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Flag className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[14px] font-semibold tracking-tight">{f.name}</h3>
                    <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-tertiary text-muted-foreground">{f.key}</code>
                    <Badge variant="outline" className="text-[10px] capitalize">{f.env}</Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1">{f.description}</p>
                  {f.enabled && (
                    <div className="mt-4 flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground w-16">Rollout</span>
                      <Slider value={[f.rollout]} onValueChange={(v) => update(f.key, { rollout: v[0] })} max={100} step={5} className="flex-1" />
                      <span className="text-[12px] tabular-nums w-12 text-right font-medium">{f.rollout}%</span>
                    </div>
                  )}
                </div>
                <Switch checked={f.enabled} onCheckedChange={(v) => update(f.key, { enabled: v })} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
