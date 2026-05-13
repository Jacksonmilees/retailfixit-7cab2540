// API client interface. Swap MockApi for HttpApi when the Azure backend lands.
// Shape of every method matches the eventual REST/gRPC contract.

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
} from "../types";

export interface ApiClient {
  // Auth
  login(email: string, password: string): Promise<{ user: User; token: string }>;
  me(): Promise<User | null>;
  logout(): Promise<void>;

  // Dashboard
  getDashboardMetrics(): Promise<DashboardMetrics>;

  // Jobs
  listJobs(query: PageQuery): Promise<Page<Job>>;
  getJob(id: string): Promise<Job>;
  createJob(input: Partial<Job>): Promise<Job>;
  updateJob(id: string, patch: Partial<Job>): Promise<Job>;
  assignJob(jobId: string, vendorId: string, opts?: { source?: "human" | "ai"; reason?: string }): Promise<Assignment>;

  // Vendors
  listVendors(query: PageQuery): Promise<Page<Vendor>>;
  getVendor(id: string): Promise<Vendor>;
  updateVendor(id: string, patch: Partial<Vendor>): Promise<Vendor>;

  // Assignments
  listAssignments(query: PageQuery): Promise<Page<Assignment>>;

  // AI
  getRecommendation(jobId: string): Promise<AIRecommendation | null>;
  requestRecommendation(jobId: string): Promise<AIRecommendation>;
  generateJobSummary(jobId: string, raw: string): Promise<string>;

  // Audit
  listAudit(query: PageQuery): Promise<Page<AuditLog>>;

  // Users
  listUsers(): Promise<User[]>;

  // Realtime
  subscribe(handler: (e: RealtimeEvent) => void): () => void;
}

import { HttpApi } from "./http-api";

// Connected to Azure Container App
export const api: ApiClient = new HttpApi({
  baseUrl: "https://api-retailfixit-dev.redplant-5c8db0a0.eastus.azurecontainerapps.io/v1"
});
