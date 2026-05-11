import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard, LiveDot } from "@/components/common/PageHeader";
import { MetricCard } from "@/components/common/MetricCard";
import { Activity, Clock, AlertTriangle, Zap, GitBranch, Server } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/observability")({ component: ObservabilityPage });

const latencySeries = Array.from({ length: 24 }).map((_, i) => ({
  hour: `${i}:00`,
  p50: 220 + Math.round(Math.sin(i / 3) * 40 + Math.random() * 30),
  p95: 480 + Math.round(Math.sin(i / 4) * 80 + Math.random() * 60),
  p99: 920 + Math.round(Math.cos(i / 5) * 120 + Math.random() * 80),
}));

const errorSeries = Array.from({ length: 24 }).map((_, i) => ({
  hour: `${i}:00`,
  err4xx: Math.max(0, Math.round(Math.random() * 12)),
  err5xx: Math.max(0, Math.round(Math.random() * 4)),
}));

const traces = [
  { id: "tr_8f2a", route: "POST /api/jobs/:id/assign", status: 200, ms: 184, ts: "12:42:11", spans: 7 },
  { id: "tr_8f29", route: "POST /api/ai/recommend", status: 200, ms: 612, ts: "12:42:09", spans: 11 },
  { id: "tr_8f28", route: "GET /api/jobs", status: 200, ms: 92, ts: "12:42:08", spans: 4 },
  { id: "tr_8f27", route: "POST /api/ai/recommend", status: 504, ms: 4012, ts: "12:41:58", spans: 9 },
  { id: "tr_8f26", route: "POST /api/jobs", status: 201, ms: 148, ts: "12:41:55", spans: 6 },
  { id: "tr_8f25", route: "GET /api/vendors", status: 200, ms: 71, ts: "12:41:50", spans: 3 },
];

function ObservabilityPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Observability" description="Traces, metrics, and event lag — Application Insights mirror" icon={Activity} actions={<LiveDot />} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Req / min" value="412" icon={Zap} delta="+6%" trend="up" />
        <MetricCard label="API p95" value="486 ms" icon={Clock} delta="-12 ms" trend="down" />
        <MetricCard label="Error rate" value="0.41%" icon={AlertTriangle} tone="warning" />
        <MetricCard label="AI override rate" value="14.2%" icon={GitBranch} delta="-2.1%" trend="down" />
      </div>

      <Tabs defaultValue="latency" className="space-y-4">
        <TabsList>
          <TabsTrigger value="latency">Latency</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="traces">Traces</TabsTrigger>
          <TabsTrigger value="events">Event lag</TabsTrigger>
        </TabsList>

        <TabsContent value="latency">
          <SectionCard title="API latency (24h)" description="p50 / p95 / p99 in ms">
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={latencySeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="p50" stroke="oklch(0.62 0.2 260)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p95" stroke="oklch(0.7 0.18 75)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p99" stroke="oklch(0.62 0.22 25)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="errors">
          <SectionCard title="Errors (24h)" description="4xx vs 5xx by hour">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={errorSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="err4xx" stackId="a" fill="oklch(0.7 0.18 75)" />
                  <Bar dataKey="err5xx" stackId="a" fill="oklch(0.62 0.22 25)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="traces">
          <SectionCard title="Recent traces" description="W3C traceparent IDs surfaced from Application Insights">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trace ID</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Spans</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {traces.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-[11px]">{t.id}</TableCell>
                    <TableCell className="text-[12px]">{t.route}</TableCell>
                    <TableCell>
                      <Badge variant={t.status >= 500 ? "destructive" : t.status >= 400 ? "secondary" : "default"} className="text-[10px]">{t.status}</Badge>
                    </TableCell>
                    <TableCell className={`text-[12px] tabular-nums ${t.ms > 1000 ? "text-destructive" : ""}`}>{t.ms} ms</TableCell>
                    <TableCell className="text-[12px]">{t.spans}</TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{t.ts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="events">
          <div className="grid gap-3 md:grid-cols-3">
            <MetricCard label="Bus lag (p95)" value="142 ms" icon={Server} />
            <MetricCard label="DLQ depth" value="0" icon={AlertTriangle} tone="success" />
            <MetricCard label="Throughput" value="38 / s" icon={Zap} />
          </div>
          <div className="mt-4">
            <SectionCard title="Subscriptions" description="Service Bus topic → subscription handlers">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Active messages</TableHead>
                    <TableHead>DLQ</TableHead>
                    <TableHead>Lag p95</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { n: "ai.recommendation.requested", a: 3, d: 0, l: "98 ms" },
                    { n: "job.assigned", a: 0, d: 0, l: "42 ms" },
                    { n: "audit.appended", a: 1, d: 0, l: "18 ms" },
                    { n: "vendor.updated", a: 0, d: 2, l: "210 ms" },
                  ].map(s => (
                    <TableRow key={s.n}>
                      <TableCell className="font-mono text-[11px]">{s.n}</TableCell>
                      <TableCell className="text-[12px] tabular-nums">{s.a}</TableCell>
                      <TableCell className={`text-[12px] tabular-nums ${s.d > 0 ? "text-destructive" : ""}`}>{s.d}</TableCell>
                      <TableCell className="text-[12px] tabular-nums">{s.l}</TableCell>
                      <TableCell><Badge variant={s.d > 0 ? "destructive" : "default"} className="text-[10px]">{s.d > 0 ? "Investigate" : "Healthy"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

