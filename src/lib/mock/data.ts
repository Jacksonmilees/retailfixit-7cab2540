import type {
  Job,
  Vendor,
  Assignment,
  AIRecommendation,
  AuditLog,
  User,
  Tenant,
  JobStatus,
  JobPriority,
} from "../types";

const TENANT: Tenant = { id: "t_1", name: "RetailFixIt", slug: "retailfixit" };

const CATEGORIES = ["HVAC", "Plumbing", "Electrical", "Refrigeration", "Carpentry", "Glass"];
const REGIONS = ["North", "South", "East", "West", "Central"];
const CITIES = ["Austin", "Dallas", "Houston", "Phoenix", "Denver", "Seattle", "Portland"];
const FIRST = ["Acme", "Bright", "Cardinal", "Delta", "Eagle", "Frontier", "Granite", "Horizon", "Iron", "Juniper"];
const LAST = ["Services", "Repair", "Solutions", "Mechanical", "Pros", "Group", "Co", "Works"];

function rand<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function isoDaysAgo(d: number): string {
  return new Date(Date.now() - d * 86400000).toISOString();
}

function isoHoursAhead(h: number): string {
  return new Date(Date.now() + h * 3600000).toISOString();
}

export const mockTenant = TENANT;

export const mockUsers: User[] = [
  {
    id: "u_admin",
    tenantId: TENANT.id,
    email: "alex@retailfixit.com",
    name: "Alex Makori",
    roles: ["admin", "dispatcher"],
  },
  {
    id: "u_disp",
    tenantId: TENANT.id,
    email: "morgan@retailfixit.com",
    name: "Morgan Lee",
    roles: ["dispatcher"],
  },
  {
    id: "u_vm",
    tenantId: TENANT.id,
    email: "sam@retailfixit.com",
    name: "Sam Patel",
    roles: ["vendor_manager"],
  },
  {
    id: "u_sup",
    tenantId: TENANT.id,
    email: "jordan@retailfixit.com",
    name: "Jordan Kim",
    roles: ["support"],
  },
];

export const mockVendors: Vendor[] = Array.from({ length: 24 }).map((_, i) => {
  const name = `${rand(FIRST, i)} ${rand(LAST, i + 3)}`;
  const cats = [rand(CATEGORIES, i), rand(CATEGORIES, i + 2)].filter((v, idx, a) => a.indexOf(v) === idx);
  const regions = [rand(REGIONS, i), rand(REGIONS, i + 1)].filter((v, idx, a) => a.indexOf(v) === idx);
  return {
    id: `v_${1000 + i}`,
    tenantId: TENANT.id,
    name,
    email: `dispatch@${name.toLowerCase().replace(/\s+/g, "")}.com`,
    phone: `+1 (555) 0${(100 + i).toString().padStart(3, "0")}`,
    categories: cats,
    regions,
    rating: Math.round((3.5 + (i % 15) / 10) * 10) / 10,
    completedJobs: 50 + i * 7,
    activeJobs: i % 6,
    capacity: 8 + (i % 5),
    status: i % 11 === 0 ? "paused" : "active",
    avgResponseMinutes: 8 + (i % 25),
    lastActiveAt: isoDaysAgo((i % 7) / 4),
  };
});

const STATUSES: JobStatus[] = ["new", "triaged", "assigned", "in_progress", "on_hold", "completed", "cancelled"];
const PRIORITIES: JobPriority[] = ["low", "normal", "high", "urgent"];

export const mockJobs: Job[] = Array.from({ length: 87 }).map((_, i) => {
  const status = rand(STATUSES, i + 1);
  const priority = rand(PRIORITIES, Math.floor(i / 3));
  const assigned = ["assigned", "in_progress", "completed"].includes(status);
  return {
    id: `j_${2000 + i}`,
    tenantId: TENANT.id,
    reference: `JOB-${(1042 + i).toString()}`,
    title: `${rand(CATEGORIES, i)} issue at store #${100 + (i % 40)}`,
    description:
      "Customer reports unit running but not cooling. Requires on-site diagnostic and likely compressor inspection. Site is open 9-6.",
    customerName: `Store #${100 + (i % 40)}`,
    customerPhone: `+1 (555) 1${(200 + i).toString().padStart(3, "0")}`,
    address: `${100 + i} Market St`,
    city: rand(CITIES, i),
    region: rand(REGIONS, i),
    category: rand(CATEGORIES, i),
    status,
    priority,
    slaDueAt: isoHoursAhead(((i % 48) - 12)),
    createdAt: isoDaysAgo((i % 14) + 0.1),
    updatedAt: isoDaysAgo(i % 5),
    assignedVendorId: assigned ? mockVendors[i % mockVendors.length].id : undefined,
    assignedAt: assigned ? isoDaysAgo((i % 4) + 0.5) : undefined,
    estimatedValue: 200 + (i * 37) % 1800,
    complexityScore: 20 + (i * 13) % 80,
    escalationRisk: ((i % 5) === 0 ? "high" : (i % 3 === 0 ? "medium" : "low")) as "low" | "medium" | "high",
    aiSummary:
      "Likely refrigerant leak based on description; recommend HVAC vendor with compressor experience. Estimated 2-3 hour visit.",
  };
});

export const mockAssignments: Assignment[] = mockJobs
  .filter((j) => j.assignedVendorId)
  .map((j, i) => ({
    id: `a_${3000 + i}`,
    jobId: j.id,
    vendorId: j.assignedVendorId!,
    assignedBy: i % 3 === 0 ? "ai" : mockUsers[i % mockUsers.length].id,
    assignedAt: j.assignedAt!,
    acceptedAt: j.status !== "assigned" ? isoDaysAgo((i % 3) + 0.2) : undefined,
    completedAt: j.status === "completed" ? isoDaysAgo(i % 2) : undefined,
    status: j.status === "completed" ? "completed" : j.status === "assigned" ? "pending" : "accepted",
    notes: i % 4 === 0 ? "Vendor confirmed ETA within SLA window." : undefined,
  }));

export const mockAIRecommendations: AIRecommendation[] = mockJobs.slice(0, 30).map((j, i) => {
  const top3 = mockVendors
    .filter((v) => v.categories.includes(j.category))
    .slice(0, 3);
  const candidates = (top3.length ? top3 : mockVendors.slice(0, 3)).map((v, idx) => ({
    vendorId: v.id,
    score: Math.round((0.95 - idx * 0.12 - (i % 7) * 0.01) * 100) / 100,
    reasoning: `${v.name} — strong match on ${j.category} in ${j.region}, current load ${v.activeJobs}/${v.capacity}, ${v.avgResponseMinutes}m avg response.`,
  }));
  return {
    id: `r_${4000 + i}`,
    jobId: j.id,
    createdAt: isoDaysAgo(i % 5),
    modelVersion: "gpt-4o-mini-2025-03",
    latencyMs: 380 + (i * 23) % 1200,
    candidates,
    confidence: candidates[0].score,
    fallbackUsed: i % 9 === 0,
    status: i % 11 === 0 ? "failed" : "ready",
    acceptedVendorId: i % 3 === 0 ? candidates[0].vendorId : undefined,
    overrideReason:
      i % 6 === 0 ? "Dispatcher selected secondary vendor due to customer preference." : undefined,
  };
});

function corrId(i: number) {
  return `cor_${(0xa1b2c3 + i * 977).toString(16)}`;
}
function traceIdFor(i: number) {
  return `00-${(0xdeadbeef + i).toString(16).padStart(32, "0").slice(0, 32)}-${(0xfeed + i).toString(16).padStart(16, "0").slice(0, 16)}-01`;
}

// Build a per-job lifecycle so timelines look real:
// JobCreated → AIRecommendationRequested → AIRecommendationReady → JobAssigned → AssignmentAccepted → JobCompleted
export const mockAudit: AuditLog[] = (() => {
  const logs: AuditLog[] = [];
  let n = 5000;
  mockJobs.slice(0, 30).forEach((job, i) => {
    const cor = corrId(i);
    const trace = traceIdFor(i);
    const baseDay = (i % 10) + 0.4;
    const vendorId = job.assignedVendorId ?? mockVendors[i % mockVendors.length].id;
    const dispatcher = mockUsers[i % mockUsers.length];
    const aiUsed = i % 3 === 0;

    logs.push({
      id: `log_${n++}`, tenantId: TENANT.id, actor: "system", actorRole: "system",
      action: "job.created", entityType: "job", entityId: job.id,
      metadata: { reference: job.reference, channel: "intake-api" },
      before: null,
      after: { status: "new", priority: job.priority, category: job.category, customerName: job.customerName },
      correlationId: cor, traceId: trace,
      createdAt: isoDaysAgo(baseDay),
    });
    logs.push({
      id: `log_${n++}`, tenantId: TENANT.id, actor: "ai", actorRole: "ai",
      action: "ai.recommendation.requested", entityType: "ai", entityId: `r_req_${i}`,
      metadata: { model: "gpt-4o-mini-2025-03", promptVersion: "v3.2", temperature: 0.2 },
      correlationId: cor, traceId: trace,
      createdAt: isoDaysAgo(baseDay - 0.02),
    });
    logs.push({
      id: `log_${n++}`, tenantId: TENANT.id, actor: "ai", actorRole: "ai",
      action: "ai.recommendation.ready", entityType: "ai", entityId: `r_${4000 + i}`,
      metadata: { latencyMs: 380 + (i * 23) % 1200, candidates: 3, confidence: 0.92 - (i % 5) * 0.04, fallback: i % 9 === 0 },
      correlationId: cor, traceId: trace,
      createdAt: isoDaysAgo(baseDay - 0.04),
    });
    if (job.assignedVendorId) {
      logs.push({
        id: `log_${n++}`, tenantId: TENANT.id,
        actor: aiUsed ? "ai" : dispatcher.id, actorRole: aiUsed ? "ai" : "dispatcher",
        action: aiUsed ? "job.assigned.ai" : "job.assigned.human",
        entityType: "job", entityId: job.id,
        metadata: { vendorId, source: aiUsed ? "ai" : "human", reason: aiUsed ? undefined : "Top-ranked vendor at capacity; selected #2." },
        before: { status: "new", assignedVendorId: null },
        after: { status: "assigned", assignedVendorId: vendorId, assignedAt: job.assignedAt },
        correlationId: cor, traceId: trace,
        createdAt: isoDaysAgo(baseDay - 0.06),
      });
      if (job.status !== "assigned") {
        logs.push({
          id: `log_${n++}`, tenantId: TENANT.id, actor: vendorId, actorRole: "system",
          action: "assignment.accepted", entityType: "assignment", entityId: `a_${3000 + i}`,
          metadata: { vendorId, etaMinutes: 45 + (i % 30) },
          before: { status: "pending" },
          after: { status: "accepted", acceptedAt: isoDaysAgo(baseDay - 0.08) },
          correlationId: cor, traceId: trace,
          createdAt: isoDaysAgo(baseDay - 0.08),
        });
      }
      if (job.status === "completed") {
        logs.push({
          id: `log_${n++}`, tenantId: TENANT.id, actor: vendorId, actorRole: "system",
          action: "job.completed", entityType: "job", entityId: job.id,
          metadata: { vendorId, partsUsed: ["compressor-relay"], invoiceTotal: 420 + (i * 11) % 600 },
          before: { status: "in_progress" },
          after: { status: "completed", completedAt: isoDaysAgo(baseDay - 0.2) },
          correlationId: cor, traceId: trace,
          createdAt: isoDaysAgo(baseDay - 0.2),
        });
      }
    }
  });
  // A few non-job events
  for (let k = 0; k < 6; k++) {
    logs.push({
      id: `log_${n++}`, tenantId: TENANT.id,
      actor: mockUsers[k % mockUsers.length].id, actorRole: "admin",
      action: "user.login", entityType: "user", entityId: mockUsers[k % mockUsers.length].id,
      metadata: { ip: `10.0.0.${10 + k}`, userAgent: "Edge/130" },
      correlationId: corrId(900 + k), traceId: traceIdFor(900 + k),
      createdAt: isoDaysAgo(k * 0.3),
    });
  }
  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
})();
