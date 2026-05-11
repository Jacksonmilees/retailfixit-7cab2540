// In-memory mock implementation of ApiClient. Simulates latency, RBAC, and a
// realtime event bus. The HTTP/SignalR backend will plug into the same interface.

import type { ApiClient } from "./client";
import type {
  Job,
  Vendor,
  Assignment,
  AIRecommendation,
  AuditLog,
  User,
  PageQuery,
  Page,
  DashboardMetrics,
  RealtimeEvent,
  JobStatus,
} from "../types";
import {
  mockJobs,
  mockVendors,
  mockAssignments,
  mockAIRecommendations,
  mockAudit,
  mockUsers,
  mockTenant,
} from "../mock/data";

const LATENCY = 220;
const delay = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms));

function paginate<T>(items: T[], q: PageQuery): Page<T> {
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export class MockApi implements ApiClient {
  private jobs: Job[] = [...mockJobs];
  private vendors: Vendor[] = [...mockVendors];
  private assignments: Assignment[] = [...mockAssignments];
  private recs: AIRecommendation[] = [...mockAIRecommendations];
  private audit: AuditLog[] = [...mockAudit];
  private users: User[] = [...mockUsers];
  private subscribers = new Set<(e: RealtimeEvent) => void>();
  private currentUser: User | null = null;

  constructor() {
    // restore session from localStorage if present
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("rfi.user");
      if (stored) {
        try { this.currentUser = JSON.parse(stored); } catch {}
      }
      // Periodically emit a "job.updated" tick to demonstrate realtime UI.
      setInterval(() => {
        if (this.subscribers.size === 0 || this.jobs.length === 0) return;
        const j = this.jobs[Math.floor(Math.random() * Math.min(10, this.jobs.length))];
        this.emit({
          id: uid("e"),
          type: "job.updated",
          tenantId: mockTenant.id,
          occurredAt: new Date().toISOString(),
          payload: { id: j.id, updatedAt: new Date().toISOString() },
        });
      }, 12000);
    }
  }

  private emit(e: RealtimeEvent) {
    for (const s of this.subscribers) s(e);
  }

  private appendAudit(entry: Omit<AuditLog, "id" | "tenantId" | "createdAt">) {
    const log: AuditLog = {
      id: uid("log"),
      tenantId: mockTenant.id,
      createdAt: new Date().toISOString(),
      ...entry,
    };
    this.audit.unshift(log);
    this.emit({
      id: uid("e"),
      type: "audit.appended",
      tenantId: mockTenant.id,
      occurredAt: log.createdAt,
      payload: log,
    });
  }

  // ---------- Auth ----------
  async login(email: string) {
    await delay(300);
    const user = this.users.find((u) => u.email === email) ?? this.users[0];
    this.currentUser = user;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("rfi.user", JSON.stringify(user));
    }
    return { user, token: "mock-jwt" };
  }
  async me() { await delay(60); return this.currentUser; }
  async logout() {
    this.currentUser = null;
    if (typeof window !== "undefined") window.localStorage.removeItem("rfi.user");
  }

  // ---------- Dashboard ----------
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    await delay();
    const byStatus = new Map<JobStatus, number>();
    for (const j of this.jobs) byStatus.set(j.status, (byStatus.get(j.status) ?? 0) + 1);
    const byPriority = new Map<string, number>();
    for (const j of this.jobs) byPriority.set(j.priority, (byPriority.get(j.priority) ?? 0) + 1);
    const days = 14;
    const trend = Array.from({ length: days }).map((_, i) => {
      const d = new Date(Date.now() - (days - 1 - i) * 86400000);
      const iso = d.toISOString().slice(0, 10);
      return {
        date: iso,
        created: 6 + ((i * 5) % 9),
        completed: 4 + ((i * 3) % 7),
      };
    });
    const aiOverrides = this.recs.filter((r) => r.overrideReason).length;
    return {
      jobsOpen: this.jobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length,
      jobsAssignedToday: this.jobs.filter((j) => j.assignedAt && Date.now() - new Date(j.assignedAt).getTime() < 86400000).length,
      jobsCompletedToday: this.jobs.filter((j) => j.status === "completed").length,
      slaBreaches: this.jobs.filter((j) => new Date(j.slaDueAt) < new Date() && !["completed", "cancelled"].includes(j.status)).length,
      avgAssignmentMinutes: 23,
      aiOverrideRate: this.recs.length ? aiOverrides / this.recs.length : 0,
      vendorsActive: this.vendors.filter((v) => v.status === "active").length,
      jobsByStatus: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
      jobsByPriority: Array.from(byPriority.entries()).map(([priority, count]) => ({ priority: priority as never, count })),
      jobsTrend: trend,
    };
  }

  // ---------- Jobs ----------
  async listJobs(q: PageQuery): Promise<Page<Job>> {
    await delay();
    let items = [...this.jobs];
    if (q.search) {
      const s = q.search.toLowerCase();
      items = items.filter(
        (j) =>
          j.reference.toLowerCase().includes(s) ||
          j.title.toLowerCase().includes(s) ||
          j.customerName.toLowerCase().includes(s) ||
          j.city.toLowerCase().includes(s),
      );
    }
    if (q.status?.length) items = items.filter((j) => q.status!.includes(j.status));
    if (q.priority?.length) items = items.filter((j) => q.priority!.includes(j.priority));
    if (q.category?.length) items = items.filter((j) => q.category!.includes(j.category));
    if (q.region?.length) items = items.filter((j) => q.region!.includes(j.region));
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return paginate(items, q);
  }

  async getJob(id: string) {
    await delay(120);
    const j = this.jobs.find((x) => x.id === id);
    if (!j) throw new Error("Job not found");
    return j;
  }

  async createJob(input: Partial<Job>) {
    await delay();
    const job: Job = {
      id: uid("j"),
      tenantId: mockTenant.id,
      reference: `JOB-${1042 + this.jobs.length}`,
      title: input.title ?? "Untitled",
      description: input.description ?? "",
      customerName: input.customerName ?? "Unknown",
      address: input.address ?? "",
      city: input.city ?? "",
      region: input.region ?? "Central",
      category: input.category ?? "HVAC",
      status: "new",
      priority: input.priority ?? "normal",
      slaDueAt: input.slaDueAt ?? new Date(Date.now() + 24 * 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedValue: input.estimatedValue ?? 500,
    };
    this.jobs.unshift(job);
    this.appendAudit({ actor: this.currentUser?.id ?? "system", actorRole: this.currentUser?.roles?.[0] ?? "system", action: "job.created", entityType: "job", entityId: job.id, metadata: { reference: job.reference } });
    this.emit({ id: uid("e"), type: "job.created", tenantId: mockTenant.id, occurredAt: job.createdAt, payload: job });
    return job;
  }

  async updateJob(id: string, patch: Partial<Job>) {
    await delay();
    const idx = this.jobs.findIndex((j) => j.id === id);
    if (idx === -1) throw new Error("Job not found");
    this.jobs[idx] = { ...this.jobs[idx], ...patch, updatedAt: new Date().toISOString() };
    this.appendAudit({ actor: this.currentUser?.id ?? "system", actorRole: this.currentUser?.roles?.[0] ?? "system", action: "job.updated", entityType: "job", entityId: id, metadata: patch as Record<string, unknown> });
    this.emit({ id: uid("e"), type: "job.updated", tenantId: mockTenant.id, occurredAt: new Date().toISOString(), payload: this.jobs[idx] });
    return this.jobs[idx];
  }

  async assignJob(jobId: string, vendorId: string, opts?: { source?: "human" | "ai"; reason?: string }) {
    await delay(280);
    const job = await this.getJob(jobId);
    const vendor = this.vendors.find((v) => v.id === vendorId);
    if (!vendor) throw new Error("Vendor not found");
    const assignment: Assignment = {
      id: uid("a"),
      jobId,
      vendorId,
      assignedBy: opts?.source === "ai" ? "ai" : (this.currentUser?.id ?? "system"),
      assignedAt: new Date().toISOString(),
      status: "pending",
      notes: opts?.reason,
    };
    this.assignments.unshift(assignment);
    job.assignedVendorId = vendorId;
    job.assignedAt = assignment.assignedAt;
    job.status = "assigned";
    this.appendAudit({
      actor: assignment.assignedBy,
      actorRole: opts?.source === "ai" ? "ai" : (this.currentUser?.roles?.[0] ?? "system"),
      action: opts?.reason ? "ai.recommendation.overridden" : "job.assigned",
      entityType: "job",
      entityId: jobId,
      metadata: { vendorId, reason: opts?.reason },
    });
    this.emit({ id: uid("e"), type: "job.assigned", tenantId: mockTenant.id, occurredAt: assignment.assignedAt, payload: { jobId, vendorId, assignmentId: assignment.id } });
    return assignment;
  }

  // ---------- Vendors ----------
  async listVendors(q: PageQuery): Promise<Page<Vendor>> {
    await delay();
    let items = [...this.vendors];
    if (q.search) {
      const s = q.search.toLowerCase();
      items = items.filter((v) => v.name.toLowerCase().includes(s) || v.email.toLowerCase().includes(s));
    }
    if (q.region?.length) items = items.filter((v) => v.regions.some((r) => q.region!.includes(r)));
    if (q.category?.length) items = items.filter((v) => v.categories.some((c) => q.category!.includes(c)));
    items.sort((a, b) => b.rating - a.rating);
    return paginate(items, q);
  }
  async getVendor(id: string) {
    await delay(100);
    const v = this.vendors.find((x) => x.id === id);
    if (!v) throw new Error("Vendor not found");
    return v;
  }
  async updateVendor(id: string, patch: Partial<Vendor>) {
    await delay();
    const idx = this.vendors.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error("Vendor not found");
    this.vendors[idx] = { ...this.vendors[idx], ...patch };
    this.appendAudit({ actor: this.currentUser?.id ?? "system", actorRole: this.currentUser?.roles?.[0] ?? "system", action: "vendor.updated", entityType: "vendor", entityId: id });
    this.emit({ id: uid("e"), type: "vendor.updated", tenantId: mockTenant.id, occurredAt: new Date().toISOString(), payload: this.vendors[idx] });
    return this.vendors[idx];
  }

  // ---------- Assignments ----------
  async listAssignments(q: PageQuery): Promise<Page<Assignment>> {
    await delay();
    let items = [...this.assignments];
    if (q.vendorId) items = items.filter((a) => a.vendorId === q.vendorId);
    items.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
    return paginate(items, q);
  }

  // ---------- AI ----------
  async getRecommendation(jobId: string) {
    await delay(80);
    return this.recs.find((r) => r.jobId === jobId) ?? null;
  }

  async requestRecommendation(jobId: string): Promise<AIRecommendation> {
    // Simulate latency, with a chance of fallback. Real impl: Azure OpenAI / Azure ML.
    const start = performance.now();
    const willFail = Math.random() < 0.1;
    await delay(willFail ? 1800 : 600 + Math.random() * 600);
    const job = await this.getJob(jobId);
    const candidates = this.vendors
      .filter((v) => v.categories.includes(job.category) && v.status === "active")
      .slice(0, 3)
      .map((v, i) => ({
        vendorId: v.id,
        score: Math.round((0.92 - i * 0.11) * 100) / 100,
        reasoning: `${v.name} matches ${job.category} in ${job.region}, ${v.activeJobs}/${v.capacity} active, ~${v.avgResponseMinutes}m response.`,
      }));
    const rec: AIRecommendation = {
      id: uid("r"),
      jobId,
      createdAt: new Date().toISOString(),
      modelVersion: "gpt-4o-mini-2025-03",
      latencyMs: Math.round(performance.now() - start),
      candidates,
      confidence: candidates[0]?.score ?? 0,
      fallbackUsed: willFail,
      status: candidates.length ? "ready" : "failed",
    };
    this.recs.unshift(rec);
    this.appendAudit({ actor: "ai", actorRole: "ai", action: "ai.recommendation.generated", entityType: "ai", entityId: rec.id, metadata: { jobId, latencyMs: rec.latencyMs, fallback: willFail } });
    this.emit({ id: uid("e"), type: "ai.recommendation.ready", tenantId: mockTenant.id, occurredAt: rec.createdAt, payload: rec });
    return rec;
  }

  async generateJobSummary(jobId: string, raw: string): Promise<string> {
    await delay(700);
    const summary = `Customer report indicates: ${raw.slice(0, 140)}... Likely ${this.jobs.find((j) => j.id === jobId)?.category ?? "service"} issue. Suggest 2h on-site visit with parts on hand.`;
    await this.updateJob(jobId, { aiSummary: summary });
    return summary;
  }

  // ---------- Audit ----------
  async listAudit(q: PageQuery): Promise<Page<AuditLog>> {
    await delay();
    let items = [...this.audit];
    if (q.search) {
      const s = q.search.toLowerCase();
      items = items.filter((a) => a.action.toLowerCase().includes(s) || a.entityId.toLowerCase().includes(s));
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return paginate(items, q);
  }

  // ---------- Users ----------
  async listUsers() { await delay(80); return this.users; }

  // ---------- Realtime ----------
  subscribe(handler: (e: RealtimeEvent) => void) {
    this.subscribers.add(handler);
    return () => { this.subscribers.delete(handler); };
  }
}
