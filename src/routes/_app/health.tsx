import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, LiveDot } from "@/components/common/PageHeader";
import { MetricCard } from "@/components/common/MetricCard";
import { HeartPulse, Database, Cloud, Cpu, Radio, ShieldAlert, Zap, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/health")({ component: HealthPage });

type Status = "healthy" | "degraded" | "down";
const statusTone: Record<Status, { color: string; icon: typeof CheckCircle2; label: string }> = {
  healthy: { color: "text-success", icon: CheckCircle2, label: "Healthy" },
  degraded: { color: "text-warning-foreground", icon: AlertTriangle, label: "Degraded" },
  down: { color: "text-destructive", icon: XCircle, label: "Down" },
};

function HealthPage() {
  const [chaos, setChaos] = React.useState({ aiTimeout: false, aiError: false, slowDb: false, busLag: false });
  const services: { name: string; icon: typeof Cloud; status: Status; latency: string; uptime: string; region: string }[] = [
    { name: "Azure OpenAI", icon: Cpu, status: chaos.aiError ? "down" : chaos.aiTimeout ? "degraded" : "healthy", latency: chaos.aiTimeout ? "4.2 s" : "612 ms", uptime: "99.94%", region: "eastus2" },
    { name: "Azure SQL", icon: Database, status: chaos.slowDb ? "degraded" : "healthy", latency: chaos.slowDb ? "1.4 s" : "18 ms", uptime: "99.99%", region: "eastus2" },
    { name: "Service Bus", icon: Radio, status: chaos.busLag ? "degraded" : "healthy", latency: chaos.busLag ? "2.1 s" : "142 ms", uptime: "99.98%", region: "eastus2" },
    { name: "SignalR Hub", icon: Zap, status: "healthy", latency: "26 ms", uptime: "99.97%", region: "eastus2" },
    { name: "Redis Cache", icon: Database, status: "healthy", latency: "2 ms", uptime: "99.99%", region: "eastus2" },
    { name: "Entra ID", icon: ShieldAlert, status: "healthy", latency: "84 ms", uptime: "99.99%", region: "global" },
    { name: "Application Insights", icon: Cloud, status: "healthy", latency: "—", uptime: "99.99%", region: "eastus2" },
  ];

  const breakers = [
    { name: "ai.recommend", state: chaos.aiError ? "open" : chaos.aiTimeout ? "half-open" : "closed", failures: chaos.aiError ? 17 : chaos.aiTimeout ? 4 : 0, threshold: 5 },
    { name: "vendor.notify", state: "closed", failures: 0, threshold: 5 },
    { name: "geocode.lookup", state: "closed", failures: 1, threshold: 5 },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="System Health" description="Live status of every Azure dependency, with circuit-breakers and chaos toggles" icon={HeartPulse} actions={<LiveDot />} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Overall" value={services.some(s => s.status === "down") ? "Down" : services.some(s => s.status === "degraded") ? "Degraded" : "Healthy"} tone={services.some(s => s.status === "down") ? "destructive" : services.some(s => s.status === "degraded") ? "warning" : "success"} icon={HeartPulse} />
        <MetricCard label="Uptime (30d)" value="99.97%" icon={CheckCircle2} />
        <MetricCard label="Open incidents" value={services.filter(s => s.status !== "healthy").length} icon={AlertTriangle} tone={services.some(s => s.status !== "healthy") ? "warning" : "default"} />
        <MetricCard label="Active breakers" value={breakers.filter(b => b.state !== "closed").length} icon={ShieldAlert} />
      </div>

      <SectionCard title="Dependencies" description="Each backend dependency reports liveness via /health probe">
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map(s => {
            const tone = statusTone[s.status];
            const Icon = s.icon;
            const StatusIcon = tone.icon;
            return (
              <div key={s.name} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-tertiary text-muted-foreground"><Icon className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="text-[13px] font-medium truncate">{s.name}</span><span className="text-[10px] text-muted-foreground">{s.region}</span></div>
                  <div className="text-[11px] text-muted-foreground">p95 {s.latency} · uptime {s.uptime}</div>
                </div>
                <div className={`flex items-center gap-1.5 text-[12px] font-medium ${tone.color}`}><StatusIcon className="h-3.5 w-3.5" />{tone.label}</div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Circuit breakers" description="Polly-style breakers around outbound calls">
        <div className="space-y-2">
          {breakers.map(b => (
            <div key={b.name} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
              <div className="flex-1">
                <div className="text-[13px] font-medium font-mono">{b.name}</div>
                <div className="text-[11px] text-muted-foreground">{b.failures}/{b.threshold} failures in window</div>
              </div>
              <Badge variant={b.state === "open" ? "destructive" : b.state === "half-open" ? "secondary" : "default"} className="text-[10px] capitalize">{b.state}</Badge>
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => toast.success(`Reset ${b.name}`)}>Reset</Button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Chaos toggles" description="Inject failures to validate degradation paths during demos and game-days">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { k: "aiTimeout" as const, label: "AI timeout (4s)", desc: "Simulate slow Azure OpenAI response" },
            { k: "aiError" as const, label: "AI 500 errors", desc: "Force fallback ranker + circuit breaker" },
            { k: "slowDb" as const, label: "Slow Azure SQL", desc: "Simulate 1.4s p95 query latency" },
            { k: "busLag" as const, label: "Service Bus lag", desc: "Delay event delivery to subscribers" },
          ].map(t => (
            <div key={t.k} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3">
              <div><Label className="text-[13px] font-medium">{t.label}</Label><div className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</div></div>
              <Switch checked={chaos[t.k]} onCheckedChange={(v) => { setChaos(c => ({ ...c, [t.k]: v })); toast.message(v ? `${t.label}: injected` : `${t.label}: cleared`); }} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
