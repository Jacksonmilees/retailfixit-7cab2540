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

export const mockAudit: AuditLog[] = Array.from({ length: 60 }).map((_, i) => {
  const job = mockJobs[i % mockJobs.length];
  const actorRoles = ["dispatcher", "admin", "ai", "system"] as const;
  const actorRole = actorRoles[i % actorRoles.length];
  const actions = [
    "job.created",
    "job.assigned",
    "job.status_changed",
    "ai.recommendation.generated",
    "ai.recommendation.overridden",
    "vendor.updated",
    "user.login",
  ];
  return {
    id: `log_${5000 + i}`,
    tenantId: TENANT.id,
    actor: actorRole === "ai" ? "ai" : actorRole === "system" ? "system" : mockUsers[i % mockUsers.length].id,
    actorRole,
    action: actions[i % actions.length],
    entityType: "job",
    entityId: job.id,
    metadata: { reference: job.reference, status: job.status },
    createdAt: isoDaysAgo(i / 10),
  };
});
