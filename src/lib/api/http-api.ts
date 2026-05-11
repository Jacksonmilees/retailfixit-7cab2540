// HTTP implementation of ApiClient for the .NET backend
// Swap this in at the bottom of client.ts to use the real backend

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
} from "../types";

interface HttpApiConfig {
  baseUrl: string;
  signalR?: string;
}

export class HttpApi implements ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private signalRHandler: ((e: RealtimeEvent) => void) | null = null;

  constructor(config: HttpApiConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
  }

  private async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  private buildQueryString(query: PageQuery): string {
    const params = new URLSearchParams();
    if (query.page) params.append("page", query.page.toString());
    if (query.pageSize) params.append("pageSize", query.pageSize.toString());
    if (query.search) params.append("search", query.search);
    if (query.sort) params.append("sort", query.sort);
    if (query.status?.length) params.append("status", query.status.join(","));
    if (query.priority?.length) params.append("priority", query.priority.join(","));
    if (query.category?.length) params.append("category", query.category.join(","));
    if (query.region?.length) params.append("region", query.region.join(","));
    if (query.vendorId) params.append("vendorId", query.vendorId);
    return params.toString() ? `?${params.toString()}` : "";
  }

  // ---------- Auth ----------
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const result = await this.fetch<{ user: User; accessToken: string; refreshToken: string }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    this.token = result.accessToken;
    return { user: result.user, token: result.accessToken };
  }

  async me(): Promise<User | null> {
    if (!this.token) return null;
    try {
      return await this.fetch<User>("/auth/me");
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.fetch("/auth/logout", { method: "POST" });
    } finally {
      this.token = null;
    }
  }

  // ---------- Dashboard ----------
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.fetch<DashboardMetrics>("/dashboard/metrics");
  }

  // ---------- Jobs ----------
  async listJobs(query: PageQuery): Promise<Page<Job>> {
    return this.fetch<Page<Job>>(`/jobs${this.buildQueryString(query)}`);
  }

  async getJob(id: string): Promise<Job> {
    return this.fetch<Job>(`/jobs/${id}`);
  }

  async createJob(input: Partial<Job>): Promise<Job> {
    return this.fetch<Job>("/jobs", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateJob(id: string, patch: Partial<Job>): Promise<Job> {
    return this.fetch<Job>(`/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  async assignJob(
    jobId: string,
    vendorId: string,
    opts?: { source?: "human" | "ai"; reason?: string }
  ): Promise<Assignment> {
    return this.fetch<Assignment>(`/jobs/${jobId}/assign`, {
      method: "POST",
      body: JSON.stringify({ vendorId, source: opts?.source, reason: opts?.reason }),
    });
  }

  // ---------- Vendors ----------
  async listVendors(query: PageQuery): Promise<Page<Vendor>> {
    return this.fetch<Page<Vendor>>(`/vendors${this.buildQueryString(query)}`);
  }

  async getVendor(id: string): Promise<Vendor> {
    return this.fetch<Vendor>(`/vendors/${id}`);
  }

  async updateVendor(id: string, patch: Partial<Vendor>): Promise<Vendor> {
    return this.fetch<Vendor>(`/vendors/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  // ---------- Assignments ----------
  async listAssignments(query: PageQuery): Promise<Page<Assignment>> {
    return this.fetch<Page<Assignment>>(`/assignments${this.buildQueryString(query)}`);
  }

  // ---------- AI ----------
  async getRecommendation(jobId: string): Promise<AIRecommendation | null> {
    try {
      return await this.fetch<AIRecommendation>(`/jobs/${jobId}/recommendation`);
    } catch {
      return null;
    }
  }

  async requestRecommendation(jobId: string): Promise<AIRecommendation> {
    return this.fetch<AIRecommendation>(`/jobs/${jobId}/recommendation`, {
      method: "POST",
    });
  }

  async generateJobSummary(jobId: string, raw: string): Promise<string> {
    const result = await this.fetch<{ summary: string }>(`/jobs/${jobId}/summary`, {
      method: "POST",
      body: JSON.stringify({ raw }),
    });
    return result.summary;
  }

  // ---------- Audit ----------
  async listAudit(query: PageQuery): Promise<Page<AuditLog>> {
    return this.fetch<Page<AuditLog>>(`/audit${this.buildQueryString(query)}`);
  }

  async exportAudit(format: "csv" | "json", from?: Date, to?: Date): Promise<Blob> {
    const params = new URLSearchParams();
    params.append("format", format);
    if (from) params.append("from", from.toISOString());
    if (to) params.append("to", to.toISOString());

    const response = await fetch(`${this.baseUrl}/audit/export?${params}`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    return response.blob();
  }

  // ---------- Users ----------
  async listUsers(): Promise<User[]> {
    return this.fetch<User[]>("/users");
  }

  // ---------- AI Governance ----------
  async getAIGovernance(): Promise<any> {
    return this.fetch("/ai/governance");
  }

  async updateAIGovernance(request: any): Promise<void> {
    await this.fetch("/ai/governance", {
      method: "PUT",
      body: JSON.stringify(request),
    });
  }

  async getAIPrompts(): Promise<any[]> {
    return this.fetch<any[]>("/ai/prompts");
  }

  async getAIEvalRuns(): Promise<any[]> {
    return this.fetch<any[]>("/ai/eval/runs");
  }

  async runAIEval(suiteId: string): Promise<any> {
    return this.fetch("/ai/eval/run", {
      method: "POST",
      body: JSON.stringify({ suiteId }),
    });
  }

  async getAIMetrics(): Promise<any> {
    return this.fetch("/ai/metrics");
  }

  async getAIBudget(): Promise<any> {
    return this.fetch("/ai/budget");
  }

  // ---------- Health & Observability ----------
  async getHealthServices(): Promise<any> {
    return this.fetch("/health/services");
  }

  async getHealthBreakers(): Promise<any[]> {
    return this.fetch<any[]>("/health/breakers");
  }

  async getHealthMetrics(): Promise<any> {
    return this.fetch("/health/metrics");
  }

  async triggerChaos(target: string, mode: string, durationSec: number): Promise<any> {
    return this.fetch("/ops/chaos", {
      method: "POST",
      body: JSON.stringify({ target, mode, durationSec }),
    });
  }

  // ---------- Feature Flags ----------
  async getFeatureFlags(): Promise<any[]> {
    return this.fetch<any[]>("/ops/feature-flags");
  }

  async updateFeatureFlag(key: string, request: any): Promise<void> {
    await this.fetch(`/ops/feature-flags/${key}`, {
      method: "PUT",
      body: JSON.stringify(request),
    });
  }

  // ---------- Reports ----------
  async getJobReportPdf(jobId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}/report.pdf`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    return response.blob();
  }

  // ---------- Realtime ----------
  subscribe(handler: (e: RealtimeEvent) => void): () => void {
    this.signalRHandler = handler;

    // Poll for updates as a simple fallback until SignalR is connected
    const interval = setInterval(async () => {
      // This is a simple polling fallback - in production, use SignalR
      // The backend SignalR hub at /hubs/ops should be used
    }, 12000);

    return () => {
      clearInterval(interval);
      this.signalRHandler = null;
    };
  }
}
