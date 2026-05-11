import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge, RiskBadge, TimeAgo } from "@/components/common/badges";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ChevronLeft, MapPin, Phone, User, Wand2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRealtime } from "@/hooks/use-realtime";
import type { Vendor } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_app/jobs/$jobId")({
  component: JobDetail,
});

function JobDetail() {
  const { jobId } = Route.useParams();
  const qc = useQueryClient();
  const job = useQuery({ queryKey: ["job", jobId], queryFn: () => api.getJob(jobId) });
  const rec = useQuery({ queryKey: ["rec", jobId], queryFn: () => api.getRecommendation(jobId) });
  const vendors = useQuery({ queryKey: ["vendors-all"], queryFn: () => api.listVendors({ pageSize: 100 }) });
  const audit = useQuery({ queryKey: ["audit-job", jobId], queryFn: () => api.listAudit({ pageSize: 50 }) });

  useRealtime(["job.updated", "job.assigned", "ai.recommendation.ready"], (e) => {
    const id = (e.payload as { jobId?: string; id?: string }).jobId ?? (e.payload as { id?: string }).id;
    if (id === jobId) {
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["rec", jobId] });
    }
  });

  const requestRec = useMutation({
    mutationFn: () => api.requestRecommendation(jobId),
    onSuccess: () => {
      toast.success("AI recommendation generated");
      qc.invalidateQueries({ queryKey: ["rec", jobId] });
    },
    onError: () => toast.error("AI request failed — fallback used"),
  });

  if (job.isLoading || !job.data) return <Skeleton className="h-96" />;
  const j = job.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link to="/jobs"><ChevronLeft className="h-4 w-4 mr-1" />All jobs</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-muted-foreground">{j.reference}</div>
                <CardTitle className="text-xl mt-1">{j.title}</CardTitle>
                <CardDescription className="mt-1">{j.category} · created <TimeAgo iso={j.createdAt} /></CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2"><StatusBadge status={j.status} /><PriorityBadge priority={j.priority} /></div>
                <RiskBadge risk={j.escalationRisk} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground leading-relaxed">{j.description}</p>
            <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t border-border">
              <Field icon={User} label="Customer" value={j.customerName} />
              <Field icon={Phone} label="Phone" value={j.customerPhone ?? "—"} />
              <Field icon={MapPin} label="Location" value={`${j.address}, ${j.city}`} />
            </div>
            {j.complexityScore != null && (
              <div className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground"><span>AI complexity score</span><span className="tabular-nums">{j.complexityScore}/100</span></div>
                <Progress value={j.complexityScore} className="mt-2 h-1.5" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI recommendation</CardTitle>
            <CardDescription>Vendor candidates ranked by Azure OpenAI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rec.isLoading ? <Skeleton className="h-32" /> : rec.data ? (
              <RecBlock rec={rec.data} vendors={vendors.data?.items ?? []} jobId={jobId} qc={qc} />
            ) : (
              <div className="text-sm text-muted-foreground">No recommendation yet for this job.</div>
            )}
            <Button size="sm" variant="outline" className="w-full" onClick={() => requestRec.mutate()} disabled={requestRec.isPending}>
              <Wand2 className="h-4 w-4 mr-1.5" />{requestRec.isPending ? "Requesting…" : rec.data ? "Regenerate" : "Request recommendation"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="timeline">
            <TabsList className="m-2">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="assignment">Assign vendor</TabsTrigger>
              <TabsTrigger value="summary">AI summary</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="p-4">
              <ol className="space-y-3">
                {audit.data?.items.filter((a) => a.entityId === jobId).slice(0, 12).map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1">
                      <div className="text-foreground"><span className="font-medium">{a.action}</span> by <span className="text-muted-foreground">{a.actor}</span></div>
                      <div className="text-xs text-muted-foreground"><TimeAgo iso={a.createdAt} /></div>
                    </div>
                  </li>
                ))}
                {!audit.data?.items.filter((a) => a.entityId === jobId).length && (
                  <li className="text-sm text-muted-foreground">No events recorded for this job yet.</li>
                )}
              </ol>
            </TabsContent>
            <TabsContent value="assignment" className="p-4">
              <AssignManually jobId={jobId} vendors={vendors.data?.items ?? []} qc={qc} />
            </TabsContent>
            <TabsContent value="summary" className="p-4">
              <AISummary jobId={jobId} initial={j.aiSummary} qc={qc} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div><div className="text-xs text-muted-foreground">{label}</div><div className="text-foreground">{value}</div></div>
    </div>
  );
}

function RecBlock({ rec, vendors, jobId, qc }: { rec: import("@/lib/types").AIRecommendation; vendors: Vendor[]; jobId: string; qc: ReturnType<typeof useQueryClient> }) {
  const m = useMutation({
    mutationFn: ({ vendorId, reason }: { vendorId: string; reason?: string }) =>
      api.assignJob(jobId, vendorId, { source: reason ? "human" : "ai", reason }),
    onSuccess: () => {
      toast.success("Assignment recorded");
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {rec.fallbackUsed ? <AlertCircle className="h-3.5 w-3.5 text-warning" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
          {rec.fallbackUsed ? "Fallback used" : "Live model"}
        </span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{rec.latencyMs}ms</span>
      </div>
      <div className="text-xs text-muted-foreground">Model {rec.modelVersion} · confidence {(rec.confidence * 100).toFixed(0)}%</div>
      {rec.candidates.map((c, i) => {
        const v = vendors.find((x) => x.id === c.vendorId);
        return (
          <div key={c.vendorId} className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-xs font-mono text-muted-foreground">#{i + 1}</span><span className="text-sm font-medium">{v?.name ?? c.vendorId}</span></div>
              <span className="text-xs tabular-nums text-primary">{(c.score * 100).toFixed(0)}%</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{c.reasoning}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" className="h-7" onClick={() => m.mutate({ vendorId: c.vendorId })} disabled={m.isPending}>Accept AI</Button>
              <OverrideButton onConfirm={(reason) => m.mutate({ vendorId: c.vendorId, reason })} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OverrideButton({ onConfirm }: { onConfirm: (reason: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7">Override</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log override reason</DialogTitle><DialogDescription>Captured for AI evaluation.</DialogDescription></DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. customer prefers vendor X" rows={4} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { onConfirm(reason); setOpen(false); setReason(""); }}>Assign with override</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignManually({ jobId, vendors, qc }: { jobId: string; vendors: Vendor[]; qc: ReturnType<typeof useQueryClient> }) {
  const [vendorId, setVendorId] = React.useState<string>("");
  const m = useMutation({
    mutationFn: () => api.assignJob(jobId, vendorId, { source: "human" }),
    onSuccess: () => { toast.success("Vendor assigned"); qc.invalidateQueries({ queryKey: ["job", jobId] }); qc.invalidateQueries({ queryKey: ["jobs"] }); },
  });
  return (
    <div className="flex items-end gap-3 max-w-2xl">
      <div className="flex-1 space-y-1.5">
        <Label>Vendor</Label>
        <Select value={vendorId} onValueChange={setVendorId}>
          <SelectTrigger><SelectValue placeholder="Choose vendor" /></SelectTrigger>
          <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name} · ★{v.rating}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button onClick={() => m.mutate()} disabled={!vendorId || m.isPending}>{m.isPending ? "Assigning…" : "Assign"}</Button>
    </div>
  );
}

function AISummary({ jobId, initial, qc }: { jobId: string; initial?: string; qc: ReturnType<typeof useQueryClient> }) {
  const [raw, setRaw] = React.useState("");
  const [out, setOut] = React.useState(initial ?? "");
  const m = useMutation({
    mutationFn: () => api.generateJobSummary(jobId, raw),
    onSuccess: (s) => { setOut(s); toast.success("Summary generated"); qc.invalidateQueries({ queryKey: ["job", jobId] }); },
  });
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Raw customer report</Label>
        <Textarea rows={8} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Paste call notes, emails, or chat transcripts…" />
        <Button onClick={() => m.mutate()} disabled={!raw || m.isPending}><Sparkles className="h-4 w-4 mr-1.5" />{m.isPending ? "Summarizing…" : "Generate summary"}</Button>
      </div>
      <div className="space-y-2">
        <Label>AI summary</Label>
        <div className="rounded-md border border-border bg-bg-secondary p-3 min-h-48 text-sm whitespace-pre-wrap">{out || <span className="text-muted-foreground">Summary will appear here.</span>}</div>
      </div>
    </div>
  );
}
