import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge, PriorityBadge, RiskBadge, TimeAgo } from "@/components/common/badges";
import { TableSkeleton } from "@/components/common/Skeletons";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { JobDetailSheet, VendorDetailSheet } from "@/components/common/DetailSheets";
import type { Assignment, Job, Vendor } from "@/lib/types";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Sparkles,
  Timer,
  User as UserIcon,
  Wrench,
} from "lucide-react";

export const Route = createFileRoute("/_app/assignments")({
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = React.useState<string | null>(null);
  const all = useQuery({
    queryKey: ["assignments"],
    queryFn: () => api.listAssignments({ pageSize: 100 }),
  });
  const vendors = useQuery({
    queryKey: ["vendors-all"],
    queryFn: () => api.listVendors({ pageSize: 100 }),
  });
  const jobs = useQuery({ queryKey: ["jobs-all"], queryFn: () => api.listJobs({ pageSize: 200 }) });
  const users = useQuery({ queryKey: ["users"], queryFn: () => api.listUsers() });

  const vmap = React.useMemo(
    () => new Map((vendors.data?.items ?? []).map((v) => [v.id, v])),
    [vendors.data?.items],
  );
  const jmap = React.useMemo(
    () => new Map((jobs.data?.items ?? []).map((j) => [j.id, j])),
    [jobs.data?.items],
  );
  const umap = React.useMemo(() => new Map((users.data ?? []).map((u) => [u.id, u])), [users.data]);
  const selected = all.data?.items.find((a) => a.id === selectedId) ?? null;
  const selectedJob = selectedJobId ? jmap.get(selectedJobId) ?? null : null;
  const selectedJobAssignment = selectedJob
    ? all.data?.items.find((a) => a.jobId === selectedJob.id)
    : undefined;
  const selectedJobVendor = selectedJobAssignment ? vmap.get(selectedJobAssignment.vendorId) : undefined;
  const selectedVendor = selectedVendorId ? vmap.get(selectedVendorId) ?? null : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assignments"
        description="Every dispatch — AI-driven and manual — with full provenance."
        icon={ArrowRightLeft}
      />

      {all.isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : !all.data?.items.length ? (
        <Card className="border-border/60 shadow-card rounded-2xl">
          <CardContent>
            <EmptyState
              icon={ArrowRightLeft}
              title="No assignments yet"
              description="Dispatched vendors will appear here as soon as the first job is assigned."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden md:block border-border/60 shadow-card rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wider">Job</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider">Vendor</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider">Source</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider">Elapsed</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider">
                      Assigned
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {all.data.items.map((a) => {
                    const j = jmap.get(a.jobId);
                    const v = vmap.get(a.vendorId);
                    return (
                      <TableRow
                        key={a.id}
                        className="text-[13px] cursor-pointer"
                        onClick={() => setSelectedId(a.id)}
                      >
                        <TableCell>
                          {j ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(a.id);
                              }}
                              className="font-mono text-[12px] text-primary hover:underline"
                            >
                              {j.reference}
                            </button>
                          ) : (
                            <span className="font-mono text-[12px]">{a.jobId}</span>
                          )}
                          <div className="text-[11px] text-muted-foreground truncate max-w-[260px] mt-0.5">
                            {j?.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          {v ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(a.id);
                              }}
                              className="hover:text-primary transition-colors"
                            >
                              {v.name}
                            </button>
                          ) : (
                            a.vendorId
                          )}
                        </TableCell>
                        <TableCell>
                          <SourceBadge assignment={a} />
                        </TableCell>
                        <TableCell>
                          <AssignmentStatusBadge assignment={a} />
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {formatDuration(a.assignedAt, a.completedAt ?? a.acceptedAt)}
                        </TableCell>
                        <TableCell className="text-right text-[11px] text-muted-foreground">
                          <TimeAgo iso={a.assignedAt} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:hidden">
            {all.data.items.map((a) => {
              const j = jmap.get(a.jobId);
              const v = vmap.get(a.vendorId);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className="text-left rounded-2xl border border-border/60 bg-card p-4 shadow-card transition-colors hover:bg-bg-secondary/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-primary">
                        {j?.reference ?? a.jobId}
                      </div>
                      <div className="mt-1 text-[14px] font-semibold leading-tight truncate">
                        {j?.title ?? "Assignment"}
                      </div>
                      <div className="mt-1 text-[12px] text-muted-foreground truncate">
                        {v?.name ?? a.vendorId}
                      </div>
                    </div>
                    <AssignmentStatusBadge assignment={a} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <SourceBadge assignment={a} />
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Timer className="h-3 w-3" />
                      {formatDuration(a.assignedAt, a.completedAt ?? a.acceptedAt)}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>

          <AssignmentDetailSheet
            assignment={selected}
            job={selected ? jmap.get(selected.jobId) : undefined}
            vendor={selected ? vmap.get(selected.vendorId) : undefined}
            actorName={selected ? actorLabel(selected, umap) : ""}
            open={Boolean(selected)}
            onOpenChange={(open) => !open && setSelectedId(null)}
            onOpenJob={(jobId) => setSelectedJobId(jobId)}
            onOpenVendor={(vendorId) => setSelectedVendorId(vendorId)}
          />

          <JobDetailSheet
            job={selectedJob}
            vendor={selectedJobVendor}
            assignment={selectedJobAssignment}
            actorName={selectedJobAssignment ? actorLabel(selectedJobAssignment, umap) : undefined}
            open={Boolean(selectedJob)}
            onOpenChange={(open) => !open && setSelectedJobId(null)}
            title="Job details from assignment"
          />

          <VendorDetailSheet
            vendor={selectedVendor}
            assignments={all.data?.items ?? []}
            jobs={jobs.data?.items ?? []}
            open={Boolean(selectedVendor)}
            onOpenChange={(open) => !open && setSelectedVendorId(null)}
          />
        </>
      )}
    </div>
  );
}

function SourceBadge({ assignment }: { assignment: Assignment }) {
  const ai = assignment.assignedBy === "ai";
  return (
    <Badge variant={ai ? "default" : "secondary"} className="text-[10px] gap-1">
      {ai ? <Sparkles className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
      {ai ? "AI dispatch" : "Human dispatch"}
    </Badge>
  );
}

function AssignmentStatusBadge({ assignment }: { assignment: Assignment }) {
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

function AssignmentDetailSheet({
  assignment,
  job,
  vendor,
  actorName,
  open,
  onOpenChange,
  onOpenJob,
  onOpenVendor,
}: {
  assignment: Assignment | null;
  job?: Job;
  vendor?: Vendor;
  actorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenJob: (jobId: string) => void;
  onOpenVendor: (vendorId: string) => void;
}) {
  if (!assignment) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-border/60 bg-background/95 p-0 backdrop-blur sm:max-w-2xl">
        <SheetHeader className="border-b border-border/60 p-5 text-left">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <SheetTitle className="text-[20px] tracking-tight">
                {job?.reference ?? assignment.jobId}
              </SheetTitle>
              <SheetDescription className="mt-1 line-clamp-2">
                {job?.title ?? "Dispatch assignment details"}
              </SheetDescription>
            </div>
            <SourceBadge assignment={assignment} />
          </div>
        </SheetHeader>

        <div className="space-y-5 p-5">
          <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Dispatch status
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <AssignmentStatusBadge assignment={assignment} />
                  <span className="text-[12px] text-muted-foreground">by {actorName}</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-bg-tertiary text-primary flex items-center justify-center">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="Assigned" value={formatDateTime(assignment.assignedAt)} />
              <Metric
                label="Accepted"
                value={assignment.acceptedAt ? formatDateTime(assignment.acceptedAt) : "Waiting"}
              />
              <Metric
                label="Completed"
                value={assignment.completedAt ? formatDateTime(assignment.completedAt) : "—"}
              />
              <Metric
                label="Elapsed"
                value={formatDuration(
                  assignment.assignedAt,
                  assignment.completedAt ?? assignment.acceptedAt,
                )}
              />
            </div>
            {assignment.notes && (
              <div className="mt-3 rounded-xl bg-bg-secondary p-3 text-[12px] text-foreground/80">
                {assignment.notes}
              </div>
            )}
          </section>

          {job && (
            <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[13px] font-semibold">
                    <Wrench className="h-4 w-4 text-primary" />
                    Job details
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">{job.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => onOpenJob(job.id)}
                >
                  View details <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={job.status} />
                <PriorityBadge priority={job.priority} />
                <RiskBadge risk={job.escalationRisk} />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Info
                  icon={UserIcon}
                  label="Customer"
                  value={`${job.customerName}${job.customerPhone ? ` · ${job.customerPhone}` : ""}`}
                />
                <Info
                  icon={MapPin}
                  label="Location"
                  value={`${job.address}, ${job.city}, ${job.region}`}
                />
                <Info icon={Clock} label="SLA" value={formatDateTime(job.slaDueAt)} />
                <Info
                  icon={Sparkles}
                  label="AI complexity"
                  value={job.complexityScore != null ? `${job.complexityScore}/100` : "Not scored"}
                />
              </div>
            </section>
          )}

          {vendor && (
            <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-brand text-primary-foreground flex items-center justify-center text-[13px] font-semibold shadow-pop">
                    {initials(vendor.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold">{vendor.name}</div>
                    <div className="text-[12px] text-muted-foreground">
                      ★ {vendor.rating} · {vendor.activeJobs}/{vendor.capacity} active ·{" "}
                      {vendor.avgResponseMinutes}m avg response
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => onOpenVendor(vendor.id)}
                >
                  View vendor <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Info icon={Phone} label="Phone" value={vendor.phone} />
                <Info icon={UserIcon} label="Email" value={vendor.email} />
                <Info icon={MapPin} label="Regions" value={Array.isArray(vendor.regions) ? vendor.regions.join(", ") : vendor.regions} />
                <Info
                  icon={CheckCircle2}
                  label="Completed jobs"
                  value={vendor.completedJobs.toLocaleString()}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(Array.isArray(vendor.categories) ? vendor.categories : vendor.categories?.split(",").map(c => c.trim()) || []).map((category) => (
                  <Badge key={category} variant="secondary" className="text-[10px]">
                    {category}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg-secondary p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-[12px] font-medium leading-tight text-foreground">{value}</div>
    </div>
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
    <div className="flex items-start gap-2 rounded-xl bg-bg-secondary p-3">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-[12px] font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function actorLabel(assignment: Assignment, users: ReadonlyMap<string, { name: string }>) {
  if (assignment.assignedBy === "ai") return "AI dispatch engine";
  return users.get(assignment.assignedBy)?.name ?? assignment.assignedBy;
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
