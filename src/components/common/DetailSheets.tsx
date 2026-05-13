import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PriorityBadge, RiskBadge, StatusBadge, TimeAgo } from "@/components/common/badges";
import type { Assignment, Job, Vendor } from "@/lib/types";
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";

export interface CustomerProfile {
  name: string;
  jobs: number;
  cities: string[];
  regions?: string[];
  phones?: string[];
  totalValue?: number;
  openJobs?: number;
  completedJobs?: number;
  urgentJobs?: number;
  lastJob?: string;
}

export function JobDetailSheet({
  job,
  vendor,
  assignment,
  actorName,
  open,
  onOpenChange,
  title = "Job details",
}: {
  job: Job | null;
  vendor?: Vendor;
  assignment?: Assignment;
  actorName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}) {
  if (!job) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-border/60 bg-background/95 p-0 backdrop-blur sm:max-w-3xl">
        <SheetHeader className="border-b border-border/60 p-5 text-left">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {job.reference}
              </div>
              <SheetTitle className="mt-1 text-[20px] leading-tight tracking-tight">
                {job.title}
              </SheetTitle>
              <SheetDescription className="mt-1 line-clamp-2">{title}</SheetDescription>
            </div>
            <StatusBadge status={job.status} />
          </div>
        </SheetHeader>

        <div className="space-y-5 p-5">
          <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <div className="flex flex-wrap gap-2">
              <PriorityBadge priority={job.priority} />
              {job.escalationRisk && <RiskBadge risk={job.escalationRisk} />}
              <Badge variant="outline" className="text-[10px]">
                {job.category}
              </Badge>
              {job.complexityScore != null && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Sparkles className="h-3 w-3" /> {job.complexityScore}/100 AI complexity
                </Badge>
              )}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-foreground/85">{job.description}</p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Info icon={Building2} label="Customer" value={job.customerName} />
            <Info icon={Phone} label="Customer phone" value={job.customerPhone ?? "—"} />
            <Info icon={MapPin} label="Full location" value={job.address ? `${job.address}, ${job.city || ''}, ${job.region || ''}` : "—"} />
            <Info icon={Wrench} label="Service category" value={job.category} />
            <Info icon={Clock} label="SLA due" value={job.slaDueAt ? formatDateTime(job.slaDueAt) : "—"} />
            <Info icon={FileText} label="Estimated value" value={job.estimatedValue ? `$${job.estimatedValue.toLocaleString()}` : "—"} />
            <Info icon={Clock} label="Created" value={formatDateTime(job.createdAt)} />
            <Info icon={Clock} label="Updated" value={formatDateTime(job.updatedAt)} />
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold">Dispatch details</div>
                <div className="text-[11px] text-muted-foreground">Assignment source, acceptance, and timing</div>
              </div>
              <Badge variant={assignment?.assignedBy === "ai" ? "default" : "secondary"} className="gap-1 text-[10px]">
                {assignment?.assignedBy === "ai" ? <Sparkles className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {assignment ? (assignment.assignedBy === "ai" ? "AI dispatch" : "Human dispatch") : "Unassigned"}
              </Badge>
            </div>
            {assignment ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Assigned by" value={actorName ?? actorLabel(assignment)} />
                <Metric label="Vendor status" value={assignment.status} />
                <Metric label="Assigned" value={formatDateTime(assignment.assignedAt)} />
                <Metric label="Accepted" value={assignment.acceptedAt ? formatDateTime(assignment.acceptedAt) : "Waiting"} />
                <Metric label="Completed" value={assignment.completedAt ? formatDateTime(assignment.completedAt) : "—"} />
                <Metric label="Elapsed" value={formatDuration(assignment.assignedAt, assignment.completedAt ?? assignment.acceptedAt)} />
                <Metric label="Assignment ID" value={assignment.id} />
                <Metric label="Notes" value={assignment.notes ?? "No notes"} />
              </div>
            ) : (
              <DispatchPanel jobId={job.id} onOpenChange={onOpenChange} />
            )}
          </section>

          {vendor && (
            <VendorSummaryCard vendor={vendor} assignment={assignment} />
          )}

          {job.aiSummary && (
            <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> AI summary
              </div>
              <p className="text-[13px] leading-relaxed text-foreground/85">{job.aiSummary}</p>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function VendorDetailSheet({
  vendor,
  assignments = [],
  jobs = [],
  open,
  onOpenChange,
}: {
  vendor: Vendor | null;
  assignments?: Assignment[];
  jobs?: Job[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!vendor) return null;
  const jobMap = new Map(jobs.map((job) => [job.id, job]));
  const recent = assignments.filter((assignment) => assignment.vendorId === vendor.id).slice(0, 8);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-border/60 bg-background/95 p-0 backdrop-blur sm:max-w-3xl">
        <SheetHeader className="border-b border-border/60 p-5 text-left">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex min-w-0 items-center gap-3">
              <AvatarLabel name={vendor.name} />
              <div className="min-w-0">
                <SheetTitle className="truncate text-[20px] tracking-tight">{vendor.name}</SheetTitle>
                <SheetDescription className="mt-1">Complete vendor profile and dispatch history</SheetDescription>
              </div>
            </div>
            <VendorStatusBadge status={vendor.status} />
          </div>
        </SheetHeader>

        <div className="space-y-5 p-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Rating" value={`${vendor.rating}/5`} />
            <Metric label="Active load" value={`${vendor.activeJobs}/${vendor.capacity}`} />
            <Metric label="Avg response" value={`${vendor.avgResponseMinutes}m`} />
            <Metric label="Completed jobs" value={vendor.completedJobs.toLocaleString()} />
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Info icon={Mail} label="Email" value={vendor.email} />
            <Info icon={Phone} label="Phone" value={vendor.phone} />
            <Info icon={MapPin} label="Regions" value={typeof vendor.regions === 'string' ? vendor.regions : vendor.regions?.join(', ') ?? '—'} />
            <Info icon={Activity} label="Last active" value={formatDateTime(vendor.lastActiveAt)} />
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <div className="text-[13px] font-semibold">Capabilities</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(typeof (vendor as any).categories === 'string' ? (vendor as any).categories.split(',').filter(Boolean) : (vendor as any).categories || []).map((category: string, idx: number) => (
                <Badge key={`cat-${idx}-${category}`} variant="secondary" className="text-[10px]">
                  {category.trim()}
                </Badge>
              ))}
              {(typeof (vendor as any).regions === 'string' ? (vendor as any).regions.split(',').filter(Boolean) : (vendor as any).regions || []).map((region: string, idx: number) => (
                <Badge key={`reg-${idx}-${region}`} variant="outline" className="text-[10px]">
                  {region.trim()}
                </Badge>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold">Recent assignments</div>
                <div className="text-[11px] text-muted-foreground">Jobs dispatched to this vendor</div>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-lg">
                <Link to="/vendors/$vendorId" params={{ vendorId: vendor.id }}>
                  Profile <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="space-y-2">
              {recent.length ? recent.map((assignment) => {
                const job = jobMap.get(assignment.jobId);
                return (
                  <div key={assignment.id} className="rounded-xl bg-bg-secondary p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] text-primary">{job?.reference ?? assignment.jobId}</div>
                        <div className="mt-0.5 truncate text-[12px] font-medium">{job?.title ?? "Assignment"}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {assignment.assignedBy === "ai" ? "AI dispatch" : "Human dispatch"} · {formatDuration(assignment.assignedAt, assignment.completedAt ?? assignment.acceptedAt)}
                        </div>
                      </div>
                      <AssignmentStatusBadge assignment={assignment} />
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-xl bg-bg-secondary p-3 text-[12px] text-muted-foreground">
                  No assignments are linked to this vendor yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function CustomerDetailSheet({
  customer,
  jobs = [],
  open,
  onOpenChange,
}: {
  customer: CustomerProfile | null;
  jobs?: Job[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!customer) return null;
  const customerJobs = jobs.filter((job) => job.customerName === customer.name);
  const latest = [...customerJobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-border/60 bg-background/95 p-0 backdrop-blur sm:max-w-3xl">
        <SheetHeader className="border-b border-border/60 p-5 text-left">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate text-[20px] tracking-tight">{customer.name}</SheetTitle>
              <SheetDescription className="mt-1">Customer account, locations, contacts, and job history</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 p-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Total jobs" value={customer.jobs.toLocaleString()} />
            <Metric label="Open jobs" value={(customer.openJobs ?? 0).toLocaleString()} />
            <Metric label="Completed" value={(customer.completedJobs ?? 0).toLocaleString()} />
            <Metric label="Total value" value={`$${(customer.totalValue ?? 0).toLocaleString()}`} />
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Info icon={Phone} label="Known phone" value={customer.phones?.[0] ?? latest?.customerPhone ?? "—"} />
            <Info icon={MapPin} label="Cities" value={customer.cities.join(", ")} />
            <Info icon={MapPin} label="Regions" value={customer.regions?.join(", ") ?? "—"} />
            <Info icon={Clock} label="Last activity" value={customer.lastJob ? formatDateTime(customer.lastJob) : "—"} />
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <div className="mb-3 text-[13px] font-semibold">Recent jobs</div>
            <div className="space-y-2">
              {customerJobs.slice(0, 10).map((job) => (
                <div key={job.id} className="rounded-xl bg-bg-secondary p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-primary">{job.reference}</div>
                      <div className="mt-0.5 truncate text-[12px] font-medium">{job.title}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {job.address}, {job.city} · <TimeAgo iso={job.createdAt} />
                      </div>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function VendorSummaryCard({ vendor, assignment }: { vendor: Vendor; assignment?: Assignment }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AvatarLabel name={vendor.name} />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold">{vendor.name}</div>
            <div className="text-[12px] text-muted-foreground">
              ★ {vendor.rating} · {vendor.activeJobs}/{vendor.capacity} active · {vendor.avgResponseMinutes}m avg
            </div>
          </div>
        </div>
        <VendorStatusBadge status={vendor.status} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Info icon={Phone} label="Phone" value={vendor.phone} />
        <Info icon={Mail} label="Email" value={vendor.email} />
        <Info icon={MapPin} label="Regions" value={typeof (vendor as any).regions === 'string' ? (vendor as any).regions : (vendor as any).regions?.join(', ') ?? '—'} />
        <Info icon={CheckCircle2} label="Completed jobs" value={vendor.completedJobs.toLocaleString()} />
      </div>
      {assignment && (
        <div className="mt-3 rounded-xl bg-bg-secondary p-3 text-[12px] text-foreground/80">
          {assignment.status === "pending" ? "Waiting for vendor acceptance" : `Vendor ${assignment.status}`} · assigned {formatDuration(assignment.assignedAt, assignment.acceptedAt ?? assignment.completedAt)} ago
        </div>
      )}
    </section>
  );
}

export function AssignmentStatusBadge({ assignment }: { assignment: Assignment }) {
  const cls =
    assignment.status === "completed"
      ? "bg-success/15 text-success border-success/30"
      : assignment.status === "accepted"
        ? "bg-primary/10 text-primary border-primary/30"
        : assignment.status === "declined"
          ? "bg-destructive/15 text-destructive border-destructive/30"
          : "bg-warning/15 text-foreground border-warning/40";
  return (
    <Badge variant="outline" className={`text-[10px] capitalize ${cls}`}>
      {assignment.status}
    </Badge>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-xl bg-bg-secondary p-3">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="break-words text-[12px] font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-xl bg-bg-secondary p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-[12px] font-medium leading-tight text-foreground">{value}</div>
    </div>
  );
}

function AvatarLabel({ name }: { name: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-[13px] font-semibold text-primary-foreground shadow-pop">
      {initials(name)}
    </div>
  );
}

function VendorStatusBadge({ status }: { status: Vendor["status"] }) {
  const cls = status === "active" ? "border-success/40 text-success" : status === "paused" ? "border-warning/40 text-foreground" : "border-destructive/40 text-destructive";
  return (
    <Badge variant="outline" className={`capitalize ${cls}`}>
      {status}
    </Badge>
  );
}

function actorLabel(assignment: Assignment) {
  return assignment.assignedBy === "ai" ? "AI dispatch engine" : assignment.assignedBy;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(startIso: string, endIso?: string) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours < 24) return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const dayHours = hours % 24;
  return dayHours ? `${days}d ${dayHours}h` : `${days}d`;
}

function DispatchPanel({ jobId, onOpenChange }: { jobId: string; onOpenChange?: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = React.useState("ai");
  const [selectedVendor, setSelectedVendor] = React.useState<string | null>(null);
  const [isDispatching, setIsDispatching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const queryClient = useQueryClient();
  
  // Fetch AI recommendation
  const { data: recommendation, isLoading: isAiLoading, error: aiError } = useQuery({
    queryKey: ['recommendation', jobId],
    queryFn: () => api.getRecommendation(jobId),
    enabled: activeTab === "ai",
  });
  
  // Fetch all vendors for manual selection
  const { data: allVendors, isLoading: isVendorsLoading } = useQuery({
    queryKey: ['vendors-all'],
    queryFn: () => api.listVendors({ pageSize: 100 }),
    enabled: activeTab === "manual",
  });
  
  // Filter vendors by search query
  const filteredVendors = React.useMemo(() => {
    if (!allVendors?.items) return [];
    if (!searchQuery.trim()) return allVendors.items;
    const query = searchQuery.toLowerCase();
    return allVendors.items.filter(v => 
      v.name.toLowerCase().includes(query) || 
      v.categories?.some(c => c.toLowerCase().includes(query))
    );
  }, [allVendors, searchQuery]);
  
  const handleDispatch = async (vendorId: string, source: 'ai' | 'human') => {
    if (!vendorId) return;
    setIsDispatching(true);
    try {
      await api.assignJob(jobId, vendorId, { 
        source,
        reason: source === 'human' ? 'Dispatcher override - manual selection' : undefined
      });
      toast.success(`Vendor ${source === 'ai' ? 'AI-dispatched' : 'manually assigned'} successfully!`);
      // Invalidate queries to refresh data without logout
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      await queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      // Close the sheet
      onOpenChange?.(false);
      // Reset state
      setSelectedVendor(null);
    } catch (err) {
      toast.error("Failed to dispatch vendor. Please try again.");
      console.error("Dispatch error:", err);
    } finally {
      setIsDispatching(false);
    }
  };
  
  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai" className="text-[12px]">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            AI Recommended
          </TabsTrigger>
          <TabsTrigger value="manual" className="text-[12px]">
            <User className="h-3.5 w-3.5 mr-1.5" />
            Manual Selection
          </TabsTrigger>
        </TabsList>
        
        {/* AI Tab */}
        <TabsContent value="ai" className="mt-3 space-y-3">
          {isAiLoading ? (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <span className="text-[14px] font-medium text-primary">AI Finding Best Vendors...</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Analyzing 6 factors: Trade match • Location • Rating • Availability • Response time
              </div>
              <div className="mt-3 flex gap-1 justify-center">
                <div className="h-1.5 w-8 bg-primary/30 rounded animate-pulse" />
                <div className="h-1.5 w-8 bg-primary/50 rounded animate-pulse delay-75" />
                <div className="h-1.5 w-8 bg-primary/70 rounded animate-pulse delay-150" />
              </div>
            </div>
          ) : aiError || !recommendation?.candidates?.length ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-warning/5 border border-warning/20 p-3">
                <div className="text-[12px] text-warning flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  AI unavailable. Switch to Manual tab.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-success/5 border border-success/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-[13px] font-medium text-success">AI Found Match!</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {(recommendation.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
                
                {recommendation.candidates.slice(0, 3).map((c: any, i: number) => (
                  <div 
                    key={`${c.vendorId}-${i}`} 
                    className={`mt-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedVendor === c.vendorId 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border/40 hover:border-primary/40'
                    }`}
                    onClick={() => setSelectedVendor(c.vendorId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">#{i + 1}</span>
                        <span className="text-[13px] font-medium">{c.vendor?.name || c.vendorId}</span>
                      </div>
                      <span className="text-[12px] font-semibold text-primary">{(c.score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      ★ {c.vendor?.rating || '4.5'} • Trade: {c.breakdown?.tradeMatch?.score || '95'}% • Geo: {c.breakdown?.geographic?.score || '90'}%
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                size="default" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!selectedVendor || isDispatching}
                onClick={() => handleDispatch(selectedVendor!, 'ai')}
              >
                {isDispatching ? (
                  <span className="animate-pulse">Dispatching...</span>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Dispatch {selectedVendor ? 'AI-Selected Vendor' : 'Choose Vendor Above'}
                  </>
                )}
              </Button>
            </div>
          )}
        </TabsContent>
        
        {/* Manual Tab */}
        <TabsContent value="manual" className="mt-3 space-y-3">
          <div className="space-y-3">
            <div className="rounded-xl bg-bg-secondary p-3">
              <div className="text-[12px] font-medium mb-2">Search Vendors</div>
              <Input 
                placeholder="Search by name or trade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-[13px]"
              />
            </div>
            
            {isVendorsLoading ? (
              <div className="text-center py-4 text-[12px] text-muted-foreground">
                Loading vendors...
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="text-center py-4 text-[12px] text-muted-foreground">
                No vendors found. Try a different search.
              </div>
            ) : (
              <div className="max-h-[280px] overflow-y-auto space-y-2">
                {filteredVendors.map((vendor: any, index: number) => (
                  <div 
                    key={`${vendor.id}-${index}`}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedVendor === vendor.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border/40 hover:border-primary/40'
                    }`}
                    onClick={() => setSelectedVendor(vendor.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium">{vendor.name}</span>
                      <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'} className="text-[9px]">
                        {vendor.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      ★ {vendor.rating || '4.0'} • {(typeof vendor.categories === 'string' ? vendor.categories.split(',').filter(Boolean) : vendor.categories || []).slice(0, 2).join(', ') || 'General'} • {vendor.activeJobs || 0} active jobs
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Button 
              size="default" 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={!selectedVendor || isDispatching}
              onClick={() => handleDispatch(selectedVendor!, 'human')}
            >
              {isDispatching ? (
                <span className="animate-pulse">Assigning...</span>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Assign Selected Vendor
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
