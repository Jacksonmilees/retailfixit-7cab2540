import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MetricCard } from "@/components/common/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FlaskConical, Play, CheckCircle2, XCircle, AlertTriangle, Clock, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { FluentSpinner } from "@/components/common/FluentSpinner";

export const Route = createFileRoute("/_app/ai-eval")({
  component: AIEvalPage,
});

const SUITES = [
  { id: "vendor-rec-v3", name: "Vendor recommendation · v3", cases: 240, pass: 218, p50: 580, p95: 1240, drift: -2.1 },
  { id: "summary-v2", name: "Job summary · v2", cases: 180, pass: 171, p50: 720, p95: 1680, drift: 0.8 },
  { id: "complexity-v1", name: "Complexity scoring · v1", cases: 320, pass: 274, p50: 240, p95: 620, drift: 4.3 },
];

const ROLLOUTS = [
  { id: "auto-assign", name: "Auto-assign on confidence ≥ 0.9", status: "Canary", traffic: 10, control: "Manual review", uplift: "+12% throughput" },
  { id: "summary-default", name: "AI summary on by default", status: "GA", traffic: 100, control: "Off", uplift: "+8% CSAT" },
  { id: "rec-reranker", name: "Reranker model B", status: "A/B", traffic: 50, control: "Model A", uplift: "+3.4% acceptance" },
];

function AIEvalPage() {
  const [running, setRunning] = React.useState<string | null>(null);

  const runSuite = (id: string) => {
    setRunning(id);
    toast.message("Evaluation started", { description: "Running offline test suite…" });
    setTimeout(() => { setRunning(null); toast.success("Suite passed · 218/240"); }, 2000);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI evaluation & rollouts"
        description="Offline test suites, A/B experiments, and drift telemetry."
        icon={FlaskConical}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Suites" value={SUITES.length} icon={FlaskConical} tone="primary" />
        <MetricCard label="Pass rate" value="92%" icon={CheckCircle2} tone="success" delta="+1.4%" trend="up" />
        <MetricCard label="Avg p50 latency" value="513ms" icon={Clock} hint="Across all models" />
        <MetricCard label="Active rollouts" value={ROLLOUTS.length} icon={Sparkles} tone="primary" />
      </div>

      <Tabs defaultValue="suites">
        <TabsList className="bg-bg-tertiary">
          <TabsTrigger value="suites" className="text-[12px]">Test suites</TabsTrigger>
          <TabsTrigger value="rollouts" className="text-[12px]">A/B rollouts</TabsTrigger>
          <TabsTrigger value="drift" className="text-[12px]">Drift</TabsTrigger>
        </TabsList>

        <TabsContent value="suites" className="mt-4 space-y-4">
          {SUITES.map((s) => (
            <Card key={s.id} className="border-border/60 shadow-card rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold tracking-tight">{s.name}</h3>
                      <Badge variant={s.pass / s.cases > 0.9 ? "default" : "secondary"} className="text-[10px]">
                        {Math.round((s.pass / s.cases) * 100)}% pass
                      </Badge>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{s.pass}/{s.cases} cases · p50 {s.p50}ms · p95 {s.p95}ms · drift {s.drift > 0 ? "+" : ""}{s.drift}%</div>
                    <Progress value={(s.pass / s.cases) * 100} className="mt-3 h-1.5" />
                  </div>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => runSuite(s.id)} disabled={running === s.id}>
                    {running === s.id ? <FluentSpinner size={14} className="text-primary" /> : <><Play className="h-3.5 w-3.5 mr-1.5" />Run</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rollouts" className="mt-4">
          <Card className="border-border/60 shadow-card rounded-2xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Experiment</TableHead><TableHead>Stage</TableHead><TableHead>Traffic</TableHead><TableHead>Control</TableHead><TableHead>Uplift</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {ROLLOUTS.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-[13px]">{r.name}</TableCell>
                      <TableCell><Badge variant={r.status === "GA" ? "default" : "outline"} className="text-[10px]">{r.status}</Badge></TableCell>
                      <TableCell className="w-48">
                        <div className="flex items-center gap-2">
                          <Progress value={r.traffic} className="h-1.5" />
                          <span className="text-[11px] tabular-nums text-muted-foreground w-8">{r.traffic}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">{r.control}</TableCell>
                      <TableCell className="text-[12px] text-success font-medium">{r.uplift}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drift" className="mt-4">
          <Card className="border-border/60 shadow-card rounded-2xl">
            <CardHeader><CardTitle className="text-[15px]">Model drift signals</CardTitle><CardDescription className="text-[12px]">Compared to baseline window</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {[
                { signal: "Prediction distribution KL", value: "0.08", status: "ok" },
                { signal: "Feature drift (rolling 7d)", value: "0.12", status: "warn" },
                { signal: "Override rate vs baseline", value: "+2.4%", status: "ok" },
                { signal: "Latency p99 trend", value: "+340ms", status: "fail" },
              ].map((d) => (
                <div key={d.signal} className="flex items-center justify-between p-3 rounded-xl border border-border/60">
                  <div className="text-[13px] font-medium">{d.signal}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] tabular-nums text-muted-foreground">{d.value}</span>
                    {d.status === "ok" && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {d.status === "warn" && <AlertTriangle className="h-4 w-4 text-warning" />}
                    {d.status === "fail" && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
