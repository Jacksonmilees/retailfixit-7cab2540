import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, PriorityBadge, TimeAgo, RiskBadge } from "@/components/common/badges";
import { TableSkeleton } from "@/components/common/Skeletons";
import { FluentSpinner } from "@/components/common/FluentSpinner";
import { Search, Plus, RefreshCcw } from "lucide-react";
import { JobDetailSheet, VendorDetailSheet, CustomerDetailSheet, type CustomerProfile } from "@/components/common/DetailSheets";
import type { Assignment, Job, JobStatus, JobPriority, User, Vendor } from "@/lib/types";
import { useRealtime } from "@/hooks/use-realtime";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/jobs")({
  component: JobsList,
});

const STATUSES: JobStatus[] = ["new", "triaged", "assigned", "in_progress", "on_hold", "completed", "cancelled"];
const PRIORITIES: JobPriority[] = ["low", "normal", "high", "urgent"];

function JobsList() {
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<JobStatus | "all">("all");
  const [priority, setPriority] = React.useState<JobPriority | "all">("all");
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = React.useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = React.useState<string | null>(null);

  const queryKey = ["jobs", { page, search, status, priority }] as const;
  const jobs = useQuery({
    queryKey,
    queryFn: () =>
      api.listJobs({
        page,
        pageSize: 15,
        search,
        status: status === "all" ? undefined : [status],
        priority: priority === "all" ? undefined : [priority],
      }),
  });
  const allJobs = useQuery({ queryKey: ["jobs-all"], queryFn: () => api.listJobs({ pageSize: 500 }) });
  const vendors = useQuery({ queryKey: ["vendors-all"], queryFn: () => api.listVendors({ pageSize: 100 }) });
  const assignments = useQuery({ queryKey: ["assignments"], queryFn: () => api.listAssignments({ pageSize: 200 }) });
  const users = useQuery({ queryKey: ["users"], queryFn: () => api.listUsers() });

  useRealtime(["job.created", "job.updated", "job.assigned"], () => {
    qc.invalidateQueries({ queryKey: ["jobs"] });
  });

  const visibleJobs = jobs.data?.items ?? [];
  const allJobItems = allJobs.data?.items ?? visibleJobs;
  const vendorMap = React.useMemo(() => new Map((vendors.data?.items ?? []).map((vendor) => [vendor.id, vendor])), [vendors.data?.items]);
  const assignmentMap = React.useMemo(() => new Map((assignments.data?.items ?? []).map((assignment) => [assignment.jobId, assignment])), [assignments.data?.items]);
  const userMap = React.useMemo(() => new Map((users.data ?? []).map((user) => [user.id, user])), [users.data]);
  const selectedJob = selectedJobId ? allJobItems.find((job) => job.id === selectedJobId) ?? null : null;
  const selectedAssignment = selectedJob ? assignmentMap.get(selectedJob.id) : undefined;
  const selectedJobVendor = selectedAssignment ? vendorMap.get(selectedAssignment.vendorId) : selectedJob?.assignedVendorId ? vendorMap.get(selectedJob.assignedVendorId) : undefined;
  const selectedVendor = selectedVendorId ? vendorMap.get(selectedVendorId) ?? null : null;
  const selectedCustomer = selectedCustomerName ? buildCustomerProfile(selectedCustomerName, allJobItems) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search reference, customer, city…" className="pl-8" />
          </div>
          <Select value={status} onValueChange={(v: string) => { setStatus(v as JobStatus | "all"); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v: string) => { setPriority(v as JobPriority | "all"); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["jobs"] })}>
            <RefreshCcw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
          <NewJobDialog />
        </CardContent>
      </Card>

      {jobs.isLoading ? (
        <TableSkeleton rows={10} cols={9} />
      ) : (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Reference</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleJobs.map((j) => {
                const assignedVendor = j.assignedVendorId ? vendorMap.get(j.assignedVendorId) : undefined;
                return (
                <TableRow key={j.id} className="cursor-pointer" onClick={() => setSelectedJobId(j.id)}>
                  <TableCell className="font-medium">
                    <button type="button" className="font-mono text-[12px] text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setSelectedJobId(j.id); }}>
                      {j.reference}
                    </button>
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate">{j.title}</TableCell>
                  <TableCell>
                    <button type="button" className="text-left text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); setSelectedCustomerName(j.customerName); }}>
                      {j.customerName}
                    </button>
                  </TableCell>
                  <TableCell>
                    {assignedVendor ? (
                      <button type="button" className="text-left text-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); setSelectedVendorId(assignedVendor.id); }}>
                        {assignedVendor.name}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>{j.category}</TableCell>
                  <TableCell><StatusBadge status={j.status} /></TableCell>
                  <TableCell><PriorityBadge priority={j.priority} /></TableCell>
                  <TableCell><RiskBadge risk={j.escalationRisk} /></TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground"><TimeAgo iso={j.slaDueAt} /></TableCell>
                </TableRow>
                );
              })}
              {jobs.data && jobs.data.items.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No jobs match your filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      <JobDetailSheet
        job={selectedJob}
        vendor={selectedJobVendor}
        assignment={selectedAssignment}
        actorName={selectedAssignment ? actorLabel(selectedAssignment, userMap) : undefined}
        open={Boolean(selectedJob)}
        onOpenChange={(open) => !open && setSelectedJobId(null)}
      />

      <VendorDetailSheet
        vendor={selectedVendor}
        assignments={assignments.data?.items ?? []}
        jobs={allJobItems}
        open={Boolean(selectedVendor)}
        onOpenChange={(open) => !open && setSelectedVendorId(null)}
      />

      <CustomerDetailSheet
        customer={selectedCustomer}
        jobs={allJobItems}
        open={Boolean(selectedCustomer)}
        onOpenChange={(open) => !open && setSelectedCustomerName(null)}
      />

      {jobs.data && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {jobs.data.page} · {jobs.data.total} total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * jobs.data.pageSize >= jobs.data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewJobDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", customerName: "", city: "", category: "HVAC", priority: "normal" as JobPriority, description: "" });
  const m = useMutation({
    mutationFn: () => api.createJob(form),
    onSuccess: () => {
      toast.success("Job created");
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
      setOpen(false);
      setForm({ title: "", customerName: "", city: "", category: "HVAC", priority: "normal", description: "" });
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New job</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create job</DialogTitle>
          <DialogDescription>Job is published and AI recommendation is requested automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Customer</Label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["HVAC", "Plumbing", "Electrical", "Refrigeration", "Carpentry", "Glass"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v: string) => setForm({ ...form, priority: v as JobPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !form.title}>{m.isPending ? <><FluentSpinner size={14} className="mr-2 text-primary-foreground" />Creating</> : "Create job"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function actorLabel(assignment: Assignment, users: ReadonlyMap<string, User>) {
  if (assignment.assignedBy === "ai") return "AI dispatch engine";
  return users.get(assignment.assignedBy)?.name ?? assignment.assignedBy;
}

function buildCustomerProfile(name: string, jobs: Job[]): CustomerProfile {
  const customerJobs = jobs.filter((job) => job.customerName === name);
  const cities = unique(customerJobs.map((job) => job.city));
  const regions = unique(customerJobs.map((job) => job.region));
  const phones = unique(customerJobs.map((job) => job.customerPhone).filter(Boolean) as string[]);
  const lastJob = customerJobs
    .map((job) => job.createdAt)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  return {
    name,
    jobs: customerJobs.length,
    cities,
    regions,
    phones,
    totalValue: customerJobs.reduce((sum, job) => sum + job.estimatedValue, 0),
    openJobs: customerJobs.filter((job) => !["completed", "cancelled"].includes(job.status)).length,
    completedJobs: customerJobs.filter((job) => job.status === "completed").length,
    urgentJobs: customerJobs.filter((job) => job.priority === "urgent").length,
    lastJob,
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
