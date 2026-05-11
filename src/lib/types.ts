// Domain types for RetailFixIt operations platform.
// These mirror the API contract the backend will implement.

export type Role = "admin" | "dispatcher" | "vendor_manager" | "support";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: Role[];
  avatarUrl?: string;
}

export type JobStatus =
  | "new"
  | "triaged"
  | "assigned"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type JobPriority = "low" | "normal" | "high" | "urgent";

export interface Job {
  id: string;
  tenantId: string;
  reference: string; // human-readable like JOB-1042
  title: string;
  description: string;
  customerName: string;
  customerPhone?: string;
  address: string;
  city: string;
  region: string;
  category: string; // e.g. HVAC, Plumbing, Electrical
  status: JobStatus;
  priority: JobPriority;
  slaDueAt: string; // ISO
  createdAt: string;
  updatedAt: string;
  assignedVendorId?: string;
  assignedAt?: string;
  estimatedValue: number;
  complexityScore?: number; // AI 0-100
  escalationRisk?: "low" | "medium" | "high"; // AI
  aiSummary?: string;
}

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  categories: string[];
  regions: string[];
  rating: number; // 0-5
  completedJobs: number;
  activeJobs: number;
  capacity: number; // max concurrent
  status: "active" | "paused" | "suspended";
  avgResponseMinutes: number;
  lastActiveAt: string;
}

export interface Assignment {
  id: string;
  jobId: string;
  vendorId: string;
  assignedBy: string; // userId or "ai"
  assignedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  status: "pending" | "accepted" | "declined" | "completed";
  notes?: string;
}

export interface AIRecommendation {
  id: string;
  jobId: string;
  createdAt: string;
  modelVersion: string;
  latencyMs: number;
  candidates: {
    vendorId: string;
    score: number; // 0-1
    reasoning: string;
  }[];
  confidence: number; // 0-1
  fallbackUsed: boolean;
  status: "pending" | "ready" | "failed";
  acceptedVendorId?: string;
  overrideReason?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actor: string; // userId or "system" or "ai"
  actorRole?: Role | "system" | "ai";
  action: string;
  entityType: "job" | "vendor" | "assignment" | "user" | "ai" | "tenant";
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardMetrics {
  jobsOpen: number;
  jobsAssignedToday: number;
  jobsCompletedToday: number;
  slaBreaches: number;
  avgAssignmentMinutes: number;
  aiOverrideRate: number; // 0-1
  vendorsActive: number;
  jobsByStatus: { status: JobStatus; count: number }[];
  jobsByPriority: { priority: JobPriority; count: number }[];
  jobsTrend: { date: string; created: number; completed: number }[];
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: JobStatus[];
  priority?: JobPriority[];
  category?: string[];
  region?: string[];
  vendorId?: string;
  sort?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Realtime event envelope (matches Service Bus / SignalR contract).
export type RealtimeEventType =
  | "job.created"
  | "job.updated"
  | "job.assigned"
  | "ai.recommendation.ready"
  | "vendor.updated"
  | "audit.appended";

export interface RealtimeEvent<T = unknown> {
  id: string;
  type: RealtimeEventType;
  tenantId: string;
  occurredAt: string;
  payload: T;
}
