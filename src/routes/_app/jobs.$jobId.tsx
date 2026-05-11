import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge, RiskBadge, TimeAgo } from "@/components/common/badges";
import { Sparkles, ChevronLeft, MapPin, Phone, User, Wand2, AlertCircle, CheckCircle2, Clock, Star, FileDown, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRealtime } from "@/hooks/use-realtime";
import type { Vendor } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FluentSpinner, InlineLoader } from "@/components/common/FluentSpinner";
import { DetailSkeleton } from "@/components/common/Skeletons";
import { generateJobReport } from "@/lib/reports/pdf";

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
    onSuccess: () => { toast.success("AI recommendation generated"); qc.invalidateQueries({ queryKey: ["rec", jobId] }); },
    onError: () => toast.error("AI request failed — fallback used"),
  });

  if (job.isLoading || !job.data) return <DetailSkeleton />;
  const j = job.data;
  const assigned = vendors.data?.items.find((v) => v.id === j.assignedVendorId);

  function exportPdf() {
    generateJobReport(j, { vendor: assigned, audit: audit.data?.items });
    toast.success("Job report downloaded");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 rounded-lg"><Link to="/jobs"><ChevronLeft className="h-4 w-4 mr-1" />All jobs</Link></Button>
        <Button size="sm" variant="outline" className="rounded-lg" onClick={exportPdf}><FileDown className="h-3.5 w-3.5 mr-1.5" />Download PDF report</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 shadow-card rounded-2xl overflow-hidden">
          <div className="h-1 bg-brand opacity-90" />
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{j.reference}</div>
                <CardTitle className="text-[22px] font-semibold tracking-tight mt-1 leading-tight">{j.title}</CardTitle>
                <CardDescription className="mt-1.5 text-[12px]">
                  <span className="text-foreground/70 font-medium">{j.category}</span>
                  <span className="mx-1.5">·</span>created <TimeAgo iso={j.createdAt} />
                  <span className="mx-1.5">·</span>SLA <TimeAgo iso={j.slaDueAt} />
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex gap-2"><StatusBadge status={j.status} /><PriorityBadge priority={j.priority} /></div>
                <RiskBadge risk={j.escalationRisk} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-[13.5px] text-foreground/90 leading-relaxed">{j.description}</p>

            <div className="grid sm:grid-cols-3 gap-3 pt-4 border-t border-border/60">
              <Field icon={User} label="Customer" value={j.customerName} />
              <Field icon={Phone} label="Phone" value={j.customerPhone ?? "—"} />
              <Field icon={MapPin} label="Location" value={`${j.address}, ${j.city}`} />
            </div>

            {assigned && (
              <div className="rounded-xl border border-border/60 bg-bg-secondary/60 p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Assigned vendor</div>
                <VendorPopover vendor={assigned}>
                  <button className="flex items-center gap-3 w-full text-left group">
                    <div className="h-10 w-10 rounded-xl bg-brand text-primary-foreground flex items-center justify-center text-[12px] font-semibold shadow-pop">
                      {assigned.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium group-hover:text-primary transition-colors">{assigned.name}</div>
                      <div className="text-[11px] text-muted-foreground">★ {assigned.rating} · {assigned.activeJobs}/{assigned.capacity} active · {assigned.avgResponseMinutes}m avg response</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Hover for details</Badge>
                  </button>
                </VendorPopover>
              </div>
            )}

            {j.complexityScore != null && (
              <div className="rounded-xl border border-border/60 bg-bg-secondary/60 p-4">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span className="uppercase tracking-wider">AI complexity score</span><span className="tabular-nums text-foreground font-medium">{j.complexityScore}/100</span></div>
                <Progress value={j.complexityScore} className="mt-2 h-1.5" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-card rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI recommendation</CardTitle>
            <CardDescription className="text-[12px]">Vendor candidates ranked by Azure OpenAI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rec.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg skeleton-shimmer" />)}
              </div>
            ) : rec.data ? (
              <RecBlock rec={rec.data} vendors={vendors.data?.items ?? []} jobId={jobId} qc={qc} />
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">
                No recommendation yet for this job.
              </div>
            )}
            <Button size="sm" variant="outline" className="w-full rounded-lg" onClick={() => requestRec.mutate()} disabled={requestRec.isPending}>
              {requestRec.isPending ? <FluentSpinner size={14} className="mr-2 text-primary" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
              {requestRec.isPending ? "Requesting" : rec.data ? "Regenerate" : "Request recommendation"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardContent className="p-0">
          <Tabs defaultValue="timeline">
            <TabsList className="m-3 bg-bg-secondary">
              <TabsTrigger value="timeline" className="text-[12px]">Timeline</TabsTrigger>
              <TabsTrigger value="assignment" className="text-[12px]">Assign vendor</TabsTrigger>
              <TabsTrigger value="summary" className="text-[12px]">AI summary</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="p-5 pt-2">
              {audit.isLoading ? <InlineLoader label="Loading timeline" /> : (
                <ol className="relative space-y-4 ml-2 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {audit.data?.items.filter((a) => a.entityId === jobId).slice(0, 12).map((a) => (
                    <li key={a.id} className="flex gap-4 text-[13px] relative">
                      <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary shrink-0 ring-4 ring-background z-10" />
                      <div className="flex-1">
                        <div className="text-foreground"><span className="font-medium">{a.action}</span> by <span className="text-muted-foreground">{a.actor}</span></div>
                        <div className="text-[11px] text-muted-foreground mt-0.5"><TimeAgo iso={a.createdAt} /></div>
                      </div>
                    </li>
                  ))}
                  {!audit.data?.items.filter((a) => a.entityId === jobId).length && (
                    <li className="text-[12px] text-muted-foreground">No events recorded for this job yet.</li>
                  )}
                </ol>
              )}
            </TabsContent>
            <TabsContent value="assignment" className="p-5 pt-2">
              <AssignManually jobId={jobId} vendors={vendors.data?.items ?? []} qc={qc} />
            </TabsContent>
            <TabsContent value="summary" className="p-5 pt-2">
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
    <div className="flex items-start gap-2.5 text-[13px]">
      <div className="h-8 w-8 rounded-lg bg-bg-tertiary text-muted-foreground flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5" /></div>
      <div className="min-w-0"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="text-foreground truncate">{value}</div></div>
    </div>
  );
}

function VendorPopover({ vendor, children }: { vendor: Vendor; children: React.ReactNode }) {
  return (
    <HoverCard openDelay={120}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80 rounded-xl border-border/60 shadow-float" side="top">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-brand text-primary-foreground flex items-center justify-center text-[13px] font-semibold shadow-pop">
              {vendor.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
            <div>
              <div className="text-[14px] font-semibold">{vendor.name}</div>
              <div className="flex items-center gap-1 text-warning text-[12px]"><Star className="h-3 w-3 fill-warning" /><span className="text-foreground tabular-nums">{vendor.rating}</span> <span className="text-muted-foreground">· {vendor.completedJobs} done</span></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-bg-secondary p-2"><div className="text-muted-foreground">Capacity</div><div className="font-medium text-foreground">{vendor.activeJobs}/{vendor.capacity}</div></div>
            <div className="rounded-lg bg-bg-secondary p-2"><div className="text-muted-foreground">Avg response</div><div className="font-medium text-foreground">{vendor.avgResponseMinutes}m</div></div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Categories</div>
            <div className="flex flex-wrap gap-1">{vendor.categories.map(c => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}</div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground border-t border-border/60 pt-2">
            <Phone className="h-3 w-3" />{vendor.phone}
          </div>
          <Link to="/vendors/$vendorId" params={{ vendorId: vendor.id }} className="text-[12px] text-primary hover:underline inline-flex items-center gap-1">Open vendor profile <ExternalLink className="h-3 w-3" /></Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function RecBlock({ rec, vendors, jobId, qc }: { rec: import("@/lib/types").AIRecommendation; vendors: Vendor[]; jobId: string; qc: ReturnType<typeof useQueryClient> }) {
  const m = useMutation({
    mutationFn: ({ vendorId, reason }: { vendorId: string; reason?: string }) =>
      api.assignJob(jobId, vendorId, { source: reason ? "human" : "ai", reason }),
    onSuccess: () => { toast.success("Assignment recorded"); qc.invalidateQueries({ queryKey: ["job", jobId] }); qc.invalidateQueries({ queryKey: ["jobs"] }); },
  });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {rec.fallbackUsed ? <AlertCircle className="h-3.5 w-3.5 text-warning" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
          {rec.fallbackUsed ? "Fallback used" : "Live model"}
        </span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{rec.latencyMs}ms</span>
      </div>
      <div className="text-[10px] text-muted-foreground">Model {rec.modelVersion} · confidence {(rec.confidence * 100).toFixed(0)}%</div>
      {rec.candidates.map((c, i) => {
        const v = vendors.find((x) => x.id === c.vendorId);
        return (
          <div key={c.vendorId} className="rounded-xl border border-border/60 p-3 hover:shadow-card transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">#{i + 1}</span>
                {v ? <VendorPopover vendor={v}><button className="text-[13px] font-medium hover:text-primary">{v.name}</button></VendorPopover> : <span className="text-[13px] font-medium">{c.vendorId}</span>}
              </div>
              <span className="text-[11px] tabular-nums text-primary font-semibold">{(c.score * 100).toFixed(0)}%</span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">{c.reasoning}</p>
            <div className="mt-2.5 flex gap-2">
              <Button size="sm" className="h-7 rounded-md text-[11px]" onClick={() => m.mutate({ vendorId: c.vendorId })} disabled={m.isPending}>
                {m.isPending ? <FluentSpinner size={12} className="text-primary-foreground" /> : "Accept AI"}
              </Button>
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
      <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7 rounded-md text-[11px]">Override</Button></DialogTrigger>
      <DialogContent className="rounded-2xl">
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
        <Label className="text-[12px]">Vendor</Label>
        <Select value={vendorId} onValueChange={setVendorId}>
          <SelectTrigger className="rounded-lg"><SelectValue placeholder="Choose vendor" /></SelectTrigger>
          <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name} · ★{v.rating}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button onClick={() => m.mutate()} disabled={!vendorId || m.isPending} className="rounded-lg">
        {m.isPending ? <FluentSpinner size={14} className="mr-2 text-primary-foreground" /> : null}
        {m.isPending ? "Assigning" : "Assign"}
      </Button>
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
        <Label className="text-[12px]">Raw customer report</Label>
        <Textarea rows={8} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Paste call notes, emails, or chat transcripts…" className="rounded-lg" />
        <Button onClick={() => m.mutate()} disabled={!raw || m.isPending} className="rounded-lg">
          {m.isPending ? <FluentSpinner size={14} className="mr-2 text-primary-foreground" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
          {m.isPending ? "Summarizing" : "Generate summary"}
        </Button>
      </div>
      <div className="space-y-2">
        <Label className="text-[12px]">AI summary</Label>
        <div className="rounded-xl border border-border/60 bg-bg-secondary p-4 min-h-48 text-[13px] leading-relaxed whitespace-pre-wrap">{out || <span className="text-muted-foreground">Summary will appear here.</span>}</div>
      </div>
    </div>
  );
}
