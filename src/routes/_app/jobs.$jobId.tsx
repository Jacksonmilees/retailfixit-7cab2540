import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge, RiskBadge, TimeAgo } from "@/components/common/badges";
import {
  Sparkles, ChevronLeft, MapPin, Phone, User, Wand2, AlertCircle, CheckCircle2,
  Clock, Star, FileDown, ExternalLink, Send, Search, ShieldCheck, Timer,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useRealtime } from "@/hooks/use-realtime";
import type { Vendor, AIRecommendation, Assignment } from "@/lib/types";
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
  const assignments = useQuery({ queryKey: ["assignments-job", jobId], queryFn: () => api.listAssignments({ pageSize: 100 }) });
  const users = useQuery({ queryKey: ["users"], queryFn: () => api.listUsers() });
  const audit = useQuery({ queryKey: ["audit-job", jobId], queryFn: () => api.listAudit({ pageSize: 50 }) });

  useRealtime(["job.updated", "job.assigned", "ai.recommendation.ready"], (e) => {
    const id = (e.payload as { jobId?: string; id?: string }).jobId ?? (e.payload as { id?: string }).id;
    if (id === jobId) {
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["rec", jobId] });
      qc.invalidateQueries({ queryKey: ["assignments-job", jobId] });
    }
  });

  if (job.isLoading || !job.data) return <DetailSkeleton />;
  const j = job.data;
  const assigned = vendors.data?.items.find((v) => v.id === j.assignedVendorId);
  const currentAssignment = assignments.data?.items.find((a) => a.jobId === jobId && a.vendorId === j.assignedVendorId);
  const assignedBy = currentAssignment ? assignmentActor(currentAssignment, users.data ?? []) : "Not assigned";
  const jobAudit = audit.data?.items.filter((a) => a.entityId === jobId) ?? [];

  function exportPdf() {
    generateJobReport(j, { vendor: assigned, audit: audit.data?.items });
    toast.success("Job report downloaded");
  }

  return (
    <div className="space-y-4 pb-24 md:pb-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 rounded-lg">
          <Link to="/jobs"><ChevronLeft className="h-4 w-4 mr-1" />All jobs</Link>
        </Button>
        <div className="hidden md:flex items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-lg" onClick={exportPdf}>
            <FileDown className="h-3.5 w-3.5 mr-1.5" />PDF report
          </Button>
          <DispatchSheet job={j} rec={rec.data} vendors={vendors.data?.items ?? []} qc={qc} jobId={jobId}>
            <Button size="sm" className="rounded-lg shadow-pop">
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {assigned ? "Reassign vendor" : "Dispatch vendor"}
            </Button>
          </DispatchSheet>
        </div>
      </div>

      {/* Hero */}
      <Card className="border-border/60 shadow-card rounded-2xl overflow-hidden">
        <div className="h-1 bg-brand opacity-90" />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{j.reference}</div>
              <CardTitle className="text-[20px] md:text-[22px] font-semibold tracking-tight mt-1 leading-tight break-words">
                {j.title}
              </CardTitle>
              <CardDescription className="mt-1.5 text-[12px]">
                <span className="text-foreground/70 font-medium">{j.category}</span>
                <span className="mx-1.5">·</span>created <TimeAgo iso={j.createdAt} />
                <span className="mx-1.5">·</span>SLA <TimeAgo iso={j.slaDueAt} />
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <StatusBadge status={j.status} />
              <PriorityBadge priority={j.priority} />
              {j.escalationRisk && <RiskBadge risk={j.escalationRisk} />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[13.5px] text-foreground/90 leading-relaxed">{j.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border/60">
            <Field icon={User} label="Customer" value={j.customerName} />
            <Field icon={Phone} label="Phone" value={j.customerPhone ?? "—"} />
            <Field icon={MapPin} label="Location" value={`${j.address}, ${j.city}`} />
          </div>

          {/* Dispatch panel — always visible */}
          <div className={`rounded-xl border p-4 ${assigned ? "border-success/30 bg-success/5" : "border-warning/40 bg-warning/5"}`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider">
                {assigned ? <ShieldCheck className="h-3.5 w-3.5 text-success" /> : <AlertCircle className="h-3.5 w-3.5 text-warning" />}
                <span className={assigned ? "text-success" : "text-warning"}>
                  {assigned ? "Vendor assigned" : "Awaiting dispatch"}
                </span>
              </div>
              <DispatchSheet job={j} rec={rec.data} vendors={vendors.data?.items ?? []} qc={qc} jobId={jobId}>
                <Button size="sm" className="rounded-lg h-8">
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {assigned ? "Reassign" : "Dispatch"}
                </Button>
              </DispatchSheet>
            </div>
            {assigned && (
              <div className="mt-3 space-y-3">
                <VendorPopover vendor={assigned}>
                  <button className="flex items-center gap-3 w-full text-left group">
                    <div className="h-10 w-10 rounded-xl bg-brand text-primary-foreground flex items-center justify-center text-[12px] font-semibold shadow-pop">
                      {assigned.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium group-hover:text-primary transition-colors truncate">{assigned.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">★ {assigned.rating} · {assigned.activeJobs}/{assigned.capacity} active · {assigned.avgResponseMinutes}m avg</div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </VendorPopover>
                <DispatchFacts assignment={currentAssignment} assignedBy={assignedBy} />
              </div>
            )}
          </div>

          {j.complexityScore != null && (
            <div className="rounded-xl border border-border/60 bg-bg-secondary/60 p-4">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="uppercase tracking-wider">AI complexity score</span>
                <span className="tabular-nums text-foreground font-medium">{j.complexityScore}/100</span>
              </div>
              <Progress value={j.complexityScore} className="mt-2 h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI rec inline preview (always visible) */}
      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-[14px] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI recommendation
            </CardTitle>
            {rec.data && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {rec.data.modelVersion} · {(rec.data.confidence * 100).toFixed(0)}% conf · {rec.data.latencyMs}ms
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {rec.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 rounded-lg skeleton-shimmer" />)}
            </div>
          ) : rec.data ? (
            <RecPreview rec={rec.data} vendors={vendors.data?.items ?? []} jobId={jobId} qc={qc} />
          ) : (
            <RequestRec jobId={jobId} qc={qc} />
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="border-border/60 shadow-card rounded-2xl">
        <CardContent className="p-0">
          <Tabs defaultValue="timeline">
            <TabsList className="m-3 bg-bg-secondary">
              <TabsTrigger value="timeline" className="text-[12px]">Timeline</TabsTrigger>
              <TabsTrigger value="summary" className="text-[12px]">AI summary</TabsTrigger>
              <TabsTrigger value="meta" className="text-[12px]">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="p-5 pt-2">
              {audit.isLoading ? <InlineLoader label="Loading timeline" /> : (
                <ol className="relative space-y-4 ml-2 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {jobAudit.slice(0, 12).map((a) => (
                    <li key={a.id} className="flex gap-4 text-[13px] relative">
                      <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary shrink-0 ring-4 ring-background z-10" />
                      <div className="flex-1">
                        <div className="text-foreground"><span className="font-medium">{a.action}</span> by <span className="text-muted-foreground">{a.actor}</span></div>
                        <div className="text-[11px] text-muted-foreground mt-0.5"><TimeAgo iso={a.createdAt} /></div>
                      </div>
                    </li>
                  ))}
                  {!jobAudit.length && (
                    <li className="text-[12px] text-muted-foreground ml-6">No events recorded for this job yet.</li>
                  )}
                </ol>
              )}
            </TabsContent>
            <TabsContent value="summary" className="p-5 pt-2">
              <AISummary jobId={jobId} initial={j.aiSummary} qc={qc} />
            </TabsContent>
            <TabsContent value="meta" className="p-5 pt-2">
              <div className="grid sm:grid-cols-2 gap-3 text-[13px]">
                <Meta label="Reference" value={j.reference} />
                <Meta label="Tenant" value={j.tenantId} />
                <Meta label="Region" value={j.region} />
                <Meta label="Estimated value" value={`$${j.estimatedValue.toLocaleString()}`} />
                <Meta label="Created" value={new Date(j.createdAt).toLocaleString()} />
                <Meta label="Updated" value={new Date(j.updatedAt).toLocaleString()} />
                <Meta label="SLA due" value={new Date(j.slaDueAt).toLocaleString()} />
                {j.assignedAt && <Meta label="Assigned" value={new Date(j.assignedAt).toLocaleString()} />}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Mobile sticky action bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/90 backdrop-blur border-t border-border/60 px-4 py-3 flex gap-2">
        <Button size="sm" variant="outline" className="rounded-lg flex-1" onClick={exportPdf}>
          <FileDown className="h-3.5 w-3.5 mr-1.5" />PDF
        </Button>
        <DispatchSheet job={j} rec={rec.data} vendors={vendors.data?.items ?? []} qc={qc} jobId={jobId}>
          <Button size="sm" className="rounded-lg flex-[2] shadow-pop">
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {assigned ? "Reassign vendor" : "Dispatch vendor"}
          </Button>
        </DispatchSheet>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 text-[13px]">
      <div className="h-8 w-8 rounded-lg bg-bg-tertiary text-muted-foreground flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5" /></div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-bg-secondary/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-foreground truncate">{value}</div>
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

function RequestRec({ jobId, qc }: { jobId: string; qc: ReturnType<typeof useQueryClient> }) {
  const m = useMutation({
    mutationFn: () => api.requestRecommendation(jobId),
    onSuccess: () => { toast.success("AI recommendation generated"); qc.invalidateQueries({ queryKey: ["rec", jobId] }); },
    onError: () => toast.error("AI request failed — fallback used"),
  });
  return (
    <div className="rounded-xl border border-dashed border-border p-5 text-center">
      <Sparkles className="h-5 w-5 text-primary mx-auto mb-2" />
      <div className="text-[13px] font-medium">No recommendation yet</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">Ask Azure OpenAI to rank vendor candidates for this job.</div>
      <Button size="sm" className="rounded-lg mt-3" onClick={() => m.mutate()} disabled={m.isPending}>
        {m.isPending ? <FluentSpinner size={14} className="mr-2 text-primary-foreground" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
        {m.isPending ? "Requesting" : "Request recommendation"}
      </Button>
    </div>
  );
}

function RecPreview({ rec, vendors, jobId, qc }: { rec: AIRecommendation; vendors: Vendor[]; jobId: string; qc: ReturnType<typeof useQueryClient> }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {rec.fallbackUsed ? <AlertCircle className="h-3.5 w-3.5 text-warning" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
          {rec.fallbackUsed ? "Fallback used" : "Live model"}
        </span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{rec.latencyMs}ms</span>
      </div>
      {rec.candidates.slice(0, 3).map((c, i) => {
        const v = vendors.find((x) => x.id === c.vendorId);
        return (
          <div key={c.vendorId} className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5">
            <span className="text-[10px] font-mono text-muted-foreground w-6 shrink-0">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              {v ? (
                <VendorPopover vendor={v}>
                  <button className="text-[13px] font-medium hover:text-primary block truncate text-left w-full">{v.name}</button>
                </VendorPopover>
              ) : (
                <span className="text-[13px] font-medium truncate">{c.vendorId}</span>
              )}
              <p className="text-[11px] text-muted-foreground line-clamp-1">{c.reasoning}</p>
            </div>
            <span className="text-[12px] tabular-nums text-primary font-semibold shrink-0">{(c.score * 100).toFixed(0)}%</span>
          </div>
        );
      })}
      <DispatchSheet
        job={undefined as never}
        rec={rec}
        vendors={vendors}
        qc={qc}
        jobId={jobId}
        defaultTab="ai"
      >
        <Button size="sm" variant="outline" className="w-full rounded-lg mt-2">
          <Send className="h-3.5 w-3.5 mr-1.5" />Open dispatch panel
        </Button>
      </DispatchSheet>
    </div>
  );
}

function DispatchSheet({
  rec, vendors, jobId, qc, children, defaultTab,
}: {
  job?: unknown;
  rec?: AIRecommendation | null | undefined;
  vendors: Vendor[];
  jobId: string;
  qc: ReturnType<typeof useQueryClient>;
  children: React.ReactNode;
  defaultTab?: "ai" | "manual";
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<"ai" | "manual">(defaultTab ?? (rec ? "ai" : "manual"));

  const assignMut = useMutation({
    mutationFn: (p: { vendorId: string; reason?: string }) =>
      api.assignJob(jobId, p.vendorId, { source: p.reason ? "human" : "ai", reason: p.reason }),
    onSuccess: () => {
      toast.success("Vendor dispatched");
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
      setOpen(false);
    },
  });

  const filtered = vendors.filter((v) =>
    !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.categories.some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <SheetTitle className="text-[16px]">Dispatch vendor</SheetTitle>
          <SheetDescription className="text-[12px]">Pick the AI-recommended vendor or manually assign one.</SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "ai" | "manual")} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-5 mt-3 bg-bg-secondary">
            <TabsTrigger value="ai" className="text-[12px] flex-1">AI recommendation</TabsTrigger>
            <TabsTrigger value="manual" className="text-[12px] flex-1">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="flex-1 overflow-y-auto px-5 py-4 space-y-3 mt-0">
            {rec ? (
              <>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    {rec.fallbackUsed ? <AlertCircle className="h-3.5 w-3.5 text-warning" /> : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                    {rec.modelVersion}
                  </span>
                  <span>{(rec.confidence * 100).toFixed(0)}% conf · {rec.latencyMs}ms</span>
                </div>
                {rec.candidates.map((c, i) => {
                  const v = vendors.find((x) => x.id === c.vendorId);
                  return (
                    <div key={c.vendorId} className="rounded-xl border border-border/60 p-3 hover:shadow-card transition-shadow">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-muted-foreground">#{i + 1}</span>
                          <span className="text-[13px] font-medium truncate">{v?.name ?? c.vendorId}</span>
                        </div>
                        <span className="text-[11px] tabular-nums text-primary font-semibold">{(c.score * 100).toFixed(0)}%</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">{c.reasoning}</p>
                      {v && (
                        <div className="mt-2 text-[10px] text-muted-foreground">
                          ★ {v.rating} · {v.activeJobs}/{v.capacity} active · {v.avgResponseMinutes}m avg
                        </div>
                      )}
                      <div className="mt-2.5 flex gap-2">
                        <Button size="sm" className="h-7 rounded-md text-[11px] flex-1" onClick={() => assignMut.mutate({ vendorId: c.vendorId })} disabled={assignMut.isPending}>
                          {assignMut.isPending ? <FluentSpinner size={12} className="text-primary-foreground" /> : "Accept AI"}
                        </Button>
                        <OverrideButton onConfirm={(reason) => assignMut.mutate({ vendorId: c.vendorId, reason })} />
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <RequestRec jobId={jobId} qc={qc} />
            )}
          </TabsContent>

          <TabsContent value="manual" className="flex-1 overflow-y-auto px-5 py-4 space-y-2 mt-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor or category…" className="pl-8 rounded-lg" />
            </div>
            {filtered.map((v) => (
              <button
                key={v.id}
                onClick={() => assignMut.mutate({ vendorId: v.id })}
                disabled={assignMut.isPending || v.status !== "active"}
                className="w-full rounded-xl border border-border/60 p-3 text-left hover:border-primary/40 hover:bg-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-bg-tertiary text-foreground flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {v.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate">{v.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">★ {v.rating} · {v.activeJobs}/{v.capacity} · {v.categories.slice(0, 2).join(", ")}</div>
                    </div>
                  </div>
                  <Send className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
              </button>
            ))}
            {!filtered.length && <div className="text-center text-[12px] text-muted-foreground py-8">No vendors match.</div>}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
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
