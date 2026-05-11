# RetailFixIt — Backend Architecture & Implementation Spec

> Production-grade, AI-enabled, multi-tenant operations platform on Azure.
> This document is the contract the frontend (`src/lib/api/client.ts`) is built against.
> Follow it end-to-end and the SPA will swap from `MockApi` to `HttpApi` with one line change.

---

## 1. High-level Architecture

```
              ┌────────────────────────────────────────────────────────────┐
              │                      Azure Front Door                      │
              │   (WAF, global anycast, TLS, custom domain, caching)       │
              └───────────────┬────────────────────────────┬───────────────┘
                              │                            │
                ┌─────────────▼─────────────┐  ┌───────────▼──────────────┐
                │  Static Web App (SPA)     │  │  API Management (APIM)   │
                │  TanStack Start build     │  │  rate limit, JWT verify  │
                └───────────────────────────┘  └───────────┬──────────────┘
                                                           │
                                  ┌────────────────────────┼────────────────────────┐
                                  │                        │                        │
                       ┌──────────▼──────────┐  ┌──────────▼──────────┐  ┌──────────▼─────────┐
                       │  App Service /      │  │  Azure Functions    │  │  SignalR Service   │
                       │  Container Apps     │  │  (AI workers,       │  │  (realtime push)   │
                       │  ASP.NET Core 8 API │  │   webhooks, cron)   │  │                    │
                       └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬─────────┘
                                  │                        │                        │
                  ┌───────────────┼────────────┬───────────┼─────────────┬──────────┘
                  │               │            │           │             │
        ┌─────────▼────────┐ ┌────▼─────┐ ┌────▼─────┐ ┌───▼──────┐ ┌────▼─────────┐
        │ Azure SQL (HA)   │ │ Cosmos   │ │ Service  │ │  Redis   │ │ Azure OpenAI │
        │ + Elastic Pool   │ │ (audit,  │ │ Bus      │ │  Cache   │ │ gpt-4o,      │
        │ row-level tenant │ │  events) │ │ topics   │ │ + Pub/Sub│ │ gpt-4o-mini, │
        └──────────────────┘ └──────────┘ └──────────┘ └──────────┘ │ embeddings   │
                  │                                                  └──────────────┘
        ┌─────────▼────────┐  ┌──────────────────┐  ┌────────────────┐  ┌──────────────────┐
        │ Blob Storage     │  │ Key Vault        │  │ App Insights + │  │ Azure AD B2C /   │
        │ (PDFs, photos)   │  │ (secrets, certs) │  │ Log Analytics  │  │ Entra External ID│
        └──────────────────┘  └──────────────────┘  └────────────────┘  └──────────────────┘
```

**Why these services**

| Concern | Service | Notes |
|---|---|---|
| API hosting | **Azure Container Apps** (preferred) or App Service | Scale-to-zero, KEDA on Service Bus depth, blue/green slots |
| Auth | **Entra External ID** (B2C successor) | OIDC, tenant claim baked into JWT |
| OLTP | **Azure SQL** (Business Critical) | RLS for tenant isolation, in-memory OLTP for hot tables |
| Events / outbox | **Cosmos DB** (analytical store on) | Append-only audit + outbox; cheap reads via change feed |
| Messaging | **Service Bus** (Premium) | Topics + subscriptions, sessions for ordering, DLQ |
| Realtime to SPA | **Azure SignalR Service** (Serverless) | Hub: `ops`, groups per tenant |
| Cache + pub/sub | **Azure Cache for Redis** (Premium) | Hot lookups, idempotency keys, rate limit, Redis Streams |
| AI | **Azure OpenAI** (`gpt-4o`, `gpt-4o-mini`, `text-embedding-3-large`) | PTU on prod, PAYG on dev |
| Vector | **Azure AI Search** (vector + hybrid) | Vendor matching index |
| Files | **Blob Storage** | SAS URLs, private containers |
| Secrets | **Key Vault** + Managed Identity | No secrets in app config |
| Observability | **Application Insights** + Log Analytics | OpenTelemetry SDK in API |
| CI/CD | **GitHub Actions** → Bicep / Terraform | Environments: dev, staging, prod |

---

## 2. Multi-tenancy & Security

- **Tenant resolution**: every JWT carries `tid` (tenant id) and `roles[]`. Middleware sets `TenantContext.Current` from the token — never from the URL or body.
- **Row-Level Security (Azure SQL)** on every table:

  ```sql
  CREATE FUNCTION rls.fn_tenant(@TenantId uniqueidentifier) RETURNS TABLE
    WITH SCHEMABINDING AS RETURN SELECT 1 AS ok WHERE @TenantId = CAST(SESSION_CONTEXT(N'TenantId') AS uniqueidentifier);

  CREATE SECURITY POLICY rls.JobsPolicy
    ADD FILTER PREDICATE rls.fn_tenant(TenantId) ON dbo.Jobs,
    ADD BLOCK PREDICATE  rls.fn_tenant(TenantId) ON dbo.Jobs AFTER INSERT;
  ```

  EF Core sets `SESSION_CONTEXT('TenantId')` per request via a `DbConnectionInterceptor`.

- **RBAC**: roles `admin | dispatcher | vendor_manager | support`. Permission matrix is hard-coded server-side and enforced via `[Authorize(Policy="jobs:assign")]`. Frontend mirror lives at `src/routes/_app/rbac.tsx` for visibility but is never trusted.
- **PII redaction**: customer phone/address scrubbed before any LLM call (regex + Microsoft Presidio). Originals stay in SQL.
- **Idempotency**: every mutating endpoint accepts `Idempotency-Key` header → Redis key `idem:{tenant}:{key}` TTL 24h.
- **Rate limiting**: APIM policy 600 req/min per user, 60 req/min on `/ai/*`.
- **Audit log is append-only** (Cosmos with TTL = none). Tamper-evidence via per-row HMAC chained to the previous row's hash (see §6).
- **Secrets**: no `.env` in prod. Managed Identity → Key Vault references in App Configuration.

---

## 3. REST API Surface

Base URL: `https://api.retailfixit.io/v1` — all endpoints require `Authorization: Bearer <jwt>` unless noted.

Common headers:
- `X-Tenant-Id` — optional override (admins only)
- `Idempotency-Key` — required on POST/PATCH that mutate
- `traceparent` — W3C trace context (auto from APIM)

Standard error shape (RFC 7807):

```json
{ "type": "https://api.retailfixit.io/errors/validation", "title": "Validation failed",
  "status": 400, "detail": "vendorId is required", "traceId": "00-…-…-01",
  "errors": { "vendorId": ["required"] } }
```

### 3.1 Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | Anonymous. Email+password OR Entra OIDC code exchange. Returns `{ accessToken, refreshToken, user }`. |
| POST | `/auth/refresh` | Rotates refresh token. |
| POST | `/auth/logout` | Revokes refresh token (Redis blacklist). |
| GET  | `/auth/me` | Returns `User`. |

JWT claims: `sub`, `tid`, `roles[]`, `permissions[]`, `exp`, `iat`, `jti`.

### 3.2 Dashboard

| Method | Path | Returns |
|---|---|---|
| GET | `/dashboard/metrics` | `DashboardMetrics` (cached 30s in Redis per tenant) |

### 3.3 Jobs

| Method | Path | Description |
|---|---|---|
| GET | `/jobs?page=&pageSize=&search=&status=&priority=&category=&region=&sort=` | `Page<Job>` |
| GET | `/jobs/{id}` | `Job` |
| POST | `/jobs` | Create job. Emits `job.created`. |
| PATCH | `/jobs/{id}` | Partial update. Emits `job.updated`. Server enforces allowed transitions. |
| POST | `/jobs/{id}/assign` | Body `{ vendorId, source: "human"|"ai", reason? }`. Emits `job.assigned`. |
| POST | `/jobs/{id}/cancel` | Body `{ reason }`. |
| GET | `/jobs/{id}/timeline` | Array of `AuditLog` with `correlationId` joined. |
| GET | `/jobs/{id}/recommendation` | Latest `AIRecommendation` or 404. |
| POST | `/jobs/{id}/recommendation` | Triggers an AI recommendation. Returns 202 + recommendationId; result arrives via SignalR. |
| POST | `/jobs/{id}/summary` | Body `{ raw }`. Returns `{ summary }`. Synchronous, gpt-4o-mini. |
| GET | `/jobs/{id}/report.pdf` | Streams generated PDF (server-side via QuestPDF). |

**State machine**

```
new ─► triaged ─► assigned ─► in_progress ─► completed
                  └► on_hold ─┘                 ▲
                  └────────────► cancelled ◄────┘
```

### 3.4 Vendors

| Method | Path | |
|---|---|---|
| GET | `/vendors` | `Page<Vendor>`, supports `category`, `region`, `search` |
| GET | `/vendors/{id}` | |
| PATCH | `/vendors/{id}` | |
| GET | `/vendors/{id}/scorecard` | acceptance%, on-time%, AI-fit history |

### 3.5 Assignments

| Method | Path | |
|---|---|---|
| GET | `/assignments?vendorId=&jobId=` | |
| POST | `/assignments/{id}/accept` | Vendor app calls (or simulated). Emits `assignment.accepted`. |
| POST | `/assignments/{id}/decline` | Body `{ reason }`. |
| POST | `/assignments/{id}/complete` | Body `{ partsUsed[], invoiceTotal, photos[] }`. |

### 3.6 AI

| Method | Path | |
|---|---|---|
| POST | `/ai/recommendation` | Body `{ jobId }`. Same as `/jobs/{id}/recommendation`. |
| POST | `/ai/summary`        | Body `{ jobId, raw }`. |
| GET  | `/ai/governance`     | Current model pinning, prompt versions, kill-switch state. |
| PUT  | `/ai/governance`     | Admin-only. Updates pinning / kill-switch. |
| GET  | `/ai/prompts`        | List prompt versions. |
| POST | `/ai/prompts/{id}/promote` | Promote a version to "active". |
| POST | `/ai/eval/run`       | Kick off a golden-set eval (Azure Function). |
| GET  | `/ai/eval/runs`      | List with precision/recall/hallucination metrics. |

### 3.7 Audit

| Method | Path | |
|---|---|---|
| GET | `/audit?search=&entityType=&entityId=&correlationId=&from=&to=` | `Page<AuditLog>` (Cosmos). |
| GET | `/audit/{id}` | Single entry incl. `before` / `after`. |
| GET | `/audit/export?format=csv|json` | Stream. Admin only. |

### 3.8 Health & Ops

| Method | Path | Auth |
|---|---|---|
| GET | `/healthz` | anon — liveness |
| GET | `/readyz`  | anon — checks SQL, Redis, Service Bus, OpenAI |
| GET | `/ops/circuit-breakers` | admin |
| POST | `/ops/chaos` | admin — body `{ target: "openai|sql|signalr", mode: "timeout|500|slow", durationSec }` |
| GET | `/ops/feature-flags` | admin |
| PUT | `/ops/feature-flags/{key}` | admin |

### 3.9 Webhooks (inbound)

| Method | Path | |
|---|---|---|
| POST | `/webhooks/intake/{tenantSlug}` | HMAC-signed job intake from POS / ticketing. |
| POST | `/webhooks/vendor/{vendorId}` | Vendor mobile app status updates. |

Always verify HMAC SHA-256 of body against the per-source secret stored in Key Vault.

---

## 4. SignalR Realtime Contract

Hub URL: `wss://<signalr>.service.signalr.net/client/?hub=ops`

Negotiate via `GET /realtime/negotiate` (server returns SignalR access token scoped to the user's tenant group `t:{tenantId}`).

Server → client method: `event(payload: RealtimeEvent)` matching:

```ts
type RealtimeEventType =
  | "job.created" | "job.updated" | "job.assigned"
  | "ai.recommendation.requested" | "ai.recommendation.ready" | "ai.recommendation.failed"
  | "vendor.updated"
  | "assignment.accepted" | "assignment.declined" | "assignment.completed"
  | "audit.appended"
  | "ops.health.changed";
```

Client → server: `subscribeJob(jobId)` (joins group `j:{jobId}`).

---

## 5. Data Model (Azure SQL)

```sql
CREATE TABLE Tenants(
  Id uniqueidentifier PRIMARY KEY,
  Name nvarchar(120) NOT NULL,
  Slug nvarchar(60) UNIQUE NOT NULL,
  CreatedAt datetime2 NOT NULL DEFAULT sysutcdatetime()
);

CREATE TABLE Users(
  Id uniqueidentifier PRIMARY KEY,
  TenantId uniqueidentifier NOT NULL REFERENCES Tenants(Id),
  Email nvarchar(255) NOT NULL,
  Name nvarchar(120) NOT NULL,
  RolesJson nvarchar(400) NOT NULL,        -- ["admin","dispatcher"]
  EntraObjectId uniqueidentifier NULL,
  CreatedAt datetime2 NOT NULL DEFAULT sysutcdatetime(),
  UNIQUE (TenantId, Email)
);

CREATE TABLE Vendors(
  Id uniqueidentifier PRIMARY KEY,
  TenantId uniqueidentifier NOT NULL,
  Name nvarchar(160) NOT NULL,
  Email nvarchar(255), Phone nvarchar(40),
  CategoriesJson nvarchar(400), RegionsJson nvarchar(400),
  Rating decimal(3,2), CompletedJobs int, ActiveJobs int, Capacity int,
  Status varchar(16) NOT NULL,             -- active|paused|suspended
  AvgResponseMinutes int, LastActiveAt datetime2,
  EmbeddingId uniqueidentifier NULL        -- pointer to AI Search doc
);

CREATE TABLE Jobs(
  Id uniqueidentifier PRIMARY KEY,
  TenantId uniqueidentifier NOT NULL,
  Reference nvarchar(20) NOT NULL,
  Title nvarchar(200) NOT NULL,
  Description nvarchar(max),
  CustomerName nvarchar(160), CustomerPhone nvarchar(40),
  Address nvarchar(240), City nvarchar(80), Region nvarchar(40),
  Category nvarchar(40), Status varchar(16), Priority varchar(8),
  SlaDueAt datetime2, CreatedAt datetime2, UpdatedAt datetime2,
  AssignedVendorId uniqueidentifier NULL, AssignedAt datetime2 NULL,
  EstimatedValue decimal(10,2),
  ComplexityScore tinyint NULL, EscalationRisk varchar(8) NULL, AiSummary nvarchar(max) NULL,
  RowVersion rowversion,
  INDEX IX_Jobs_TenantStatus (TenantId, Status, CreatedAt DESC)
);

CREATE TABLE Assignments(
  Id uniqueidentifier PRIMARY KEY,
  TenantId uniqueidentifier NOT NULL,
  JobId uniqueidentifier NOT NULL REFERENCES Jobs(Id),
  VendorId uniqueidentifier NOT NULL REFERENCES Vendors(Id),
  AssignedBy nvarchar(60) NOT NULL,        -- userId or "ai"
  AssignedAt datetime2, AcceptedAt datetime2 NULL, CompletedAt datetime2 NULL,
  Status varchar(16) NOT NULL,
  Notes nvarchar(max)
);

CREATE TABLE AIRecommendations(
  Id uniqueidentifier PRIMARY KEY,
  TenantId uniqueidentifier NOT NULL,
  JobId uniqueidentifier NOT NULL,
  CreatedAt datetime2 NOT NULL,
  ModelVersion nvarchar(60), PromptVersion nvarchar(20),
  LatencyMs int, Confidence decimal(4,3), FallbackUsed bit, Status varchar(12),
  CandidatesJson nvarchar(max),            -- [{vendorId,score,reasoning}]
  AcceptedVendorId uniqueidentifier NULL, OverrideReason nvarchar(400) NULL,
  PromptTokens int, CompletionTokens int, CostUsd decimal(8,4)
);

CREATE TABLE FeatureFlags(
  TenantId uniqueidentifier NOT NULL,
  [Key] varchar(60) NOT NULL,
  Enabled bit NOT NULL,
  RolloutPercent tinyint NOT NULL DEFAULT 0,
  AllowlistJson nvarchar(max) NULL,
  PRIMARY KEY (TenantId, [Key])
);

CREATE TABLE OutboxMessages(
  Id uniqueidentifier PRIMARY KEY,
  TenantId uniqueidentifier NOT NULL,
  Type varchar(60) NOT NULL,
  PayloadJson nvarchar(max) NOT NULL,
  CorrelationId varchar(60) NOT NULL,
  CreatedAt datetime2 NOT NULL DEFAULT sysutcdatetime(),
  ProcessedAt datetime2 NULL,
  Attempts int NOT NULL DEFAULT 0,
  INDEX IX_Outbox_Pending (ProcessedAt) WHERE ProcessedAt IS NULL
);
```

**Audit log lives in Cosmos** (`audit` container, partition `/tenantId`):

```jsonc
{
  "id": "log_…",
  "tenantId": "…",
  "actor": "user_…|ai|system",
  "actorRole": "dispatcher|admin|ai|system",
  "action": "job.assigned",
  "entityType": "job",
  "entityId": "j_…",
  "before": { "status": "new", "assignedVendorId": null },
  "after":  { "status": "assigned", "assignedVendorId": "v_…" },
  "metadata": { "vendorId": "v_…", "source": "ai" },
  "correlationId": "cor_…",
  "traceId": "00-…-…-01",
  "prevHash": "sha256:…",
  "hash": "sha256:…",
  "createdAt": "2026-05-11T12:34:56Z"
}
```

`hash = SHA256(prevHash || canonical(json without hash))`. Stored append-only — verifier job recomputes the chain nightly.

---

## 6. Event-Driven Flow (the story for the demo video)

A single `correlationId` (also propagated as W3C `traceparent`) follows a job from intake to completion.

```
[Intake API]
   POST /webhooks/intake/{tenant}
        │  validates HMAC, generates correlationId = cor_xyz
        ▼
[API: JobsService.Create]
   ├─► SQL INSERT Jobs           (transactional with…)
   ├─► SQL INSERT OutboxMessages (Type=job.created, cor_xyz)
   └─► Cosmos audit append       (action=job.created, before=null, after={…})

[Outbox Dispatcher (BackgroundService)]
   reads pending → publishes to Service Bus topic `events`
         subject: job.created      session: tenantId
         user properties: correlationId, traceparent

[Service Bus subscribers]
   ├─► [SignalR Fanout Function]   → emits to group t:{tenantId}
   ├─► [AI Recommender Function]   → calls Azure OpenAI
   │      ├─ audit: ai.recommendation.requested
   │      ├─ Azure OpenAI gpt-4o-mini chat.completions
   │      ├─ store AIRecommendation row
   │      ├─ audit: ai.recommendation.ready
   │      └─ outbox → SignalR → SPA updates job detail live
   └─► [Search Indexer]            → upserts job into Azure AI Search

[Dispatcher clicks "Dispatch"]
   POST /jobs/{id}/assign  (Idempotency-Key)
   ├─► SQL UPDATE Jobs + INSERT Assignments (txn)
   ├─► OutboxMessages (job.assigned, same cor_xyz)
   └─► audit: job.assigned (before/after)

[Vendor mobile webhook]
   POST /webhooks/vendor/{vendorId}  status=accepted
   ├─► UPDATE Assignments
   └─► audit: assignment.accepted

…and so on through completed.
```

The frontend's per-job timeline (`/jobs/$jobId` → Timeline tab) renders this exact sequence with correlation/trace IDs surfaced — the demo proves end-to-end traceability.

---

## 7. AI Subsystem (detailed)

### 7.1 Models

| Use case | Model | Deployment | Why |
|---|---|---|---|
| Vendor recommendation | `gpt-4o` (function-calling) | PTU 100 in `eastus2` | Best reasoning, structured tool output |
| Job summary / triage | `gpt-4o-mini` | PAYG | Cheap, fast (<1.5s p95) |
| Embeddings (vendor & job text) | `text-embedding-3-large` (3072d) | PAYG | Semantic vendor matching in AI Search |
| Eval / classification | `gpt-4o-mini` | PAYG | Used by golden-set eval harness |
| Vision (photo triage – future) | `gpt-4o` | PTU shared | Optional: triage via uploaded photos |

All deployments live in **two regions** (`eastus2`, `swedencentral`) behind a Front Door + APIM round-robin with health probes for **regional failover**. Pin a specific model snapshot (`gpt-4o-2024-11-20`) — never `latest`.

### 7.2 Recommendation pipeline

1. Receive `RecommendationRequested` from Service Bus.
2. PII redaction (Microsoft Presidio) on description.
3. Hybrid retrieval from Azure AI Search:
   - BM25 over `category`, `region`
   - Vector cosine on the job description embedding
   - Top 20 candidates → re-ranked by business rules (capacity, rating, distance via Azure Maps).
4. Top 5 sent to `gpt-4o` with this **system prompt v3.2**:

   ```
   You are RetailFixIt's dispatch assistant. Given a job and 5 candidate vendors,
   return a JSON tool call `propose_vendors` with up to 3 ranked candidates and
   per-candidate reasoning (≤200 chars). Never invent vendors. If confidence < 0.6
   for the top pick, set "fallbackToHuman": true.
   ```

   Tool schema:

   ```json
   {
     "name": "propose_vendors",
     "parameters": {
       "type": "object",
       "properties": {
         "candidates": { "type": "array", "items": {
           "type": "object",
           "properties": {
             "vendorId": { "type": "string" },
             "score": { "type": "number", "minimum": 0, "maximum": 1 },
             "reasoning": { "type": "string", "maxLength": 240 }
           },
           "required": ["vendorId", "score", "reasoning"]
         }},
         "fallbackToHuman": { "type": "boolean" }
       },
       "required": ["candidates", "fallbackToHuman"]
     }
   }
   ```

5. `temperature: 0.2`, `top_p: 0.9`, `max_tokens: 600`, `seed: stable per tenant` for reproducibility.
6. Wrap in **Polly**: timeout 6s, retry 2× exponential, circuit breaker 5 failures / 30s, fallback to deterministic rule-based ranker (top by `score = 0.5*rating/5 + 0.3*(1-load) + 0.2*(1-min(responseMin,60)/60)`).
7. Persist `AIRecommendations` row with token counts + cost; emit `ai.recommendation.ready`.

### 7.3 Governance

Stored in `AIPromptVersions` and `AIGovernance` tables; surfaced at `/ai/governance`:

- **Kill-switch**: when `enabled=false`, every AI endpoint returns `{ fallbackUsed: true }` from rule-based ranker.
- **Pinning**: `modelVersion`, `promptVersion`, `temperature`, `topP` per environment.
- **Guardrails**: `confidenceFloor` (recommend block if below), `maxTokensPerRecommendation`, `dailyBudgetUsd` (Redis counter), `piiRedactionRequired=true`.
- **Audit**: every governance change writes an `audit` row with `before/after`.

### 7.4 Eval harness

Azure Function `ai-eval-runner` triggered by `POST /ai/eval/run` or nightly Timer:

1. Loads golden set from Blob (`gold/recommendations-v3.jsonl`) — 200 hand-labelled jobs with the "correct" vendor.
2. Replays each through the live pipeline with `seed`.
3. Computes Top-1 accuracy, Top-3 recall, hallucination rate (vendor IDs not in candidate set), latency p50/p95.
4. Writes `AIEvalRuns` row + uploads HTML report to Blob.
5. Publishes `ai.eval.completed` event; dashboard surfaces drift vs prior run.

A/B rollout: feature flag `ai.recommender.v4` with `RolloutPercent` — bucket on `hash(jobId) % 100`.

---

## 8. Failure Modes & Degradation

| Dependency | Failure | Behavior |
|---|---|---|
| Azure OpenAI | timeout / 5xx / circuit open | Polly fallback → rule-based ranker, `fallbackUsed=true`, surfaced in UI |
| Azure SQL | transient | EF Core retry strategy (6 attempts, exp backoff) |
| Service Bus | unavailable | Outbox queues locally, drained when service returns; UI shows "events delayed" banner via `ops.health.changed` |
| SignalR | disconnect | SPA reconnect with backoff; on reconnect, refetch open queries |
| Redis | down | Bypass cache, hit SQL directly; idempotency check degrades to "best effort" with warning logged |
| AI Search | down | Recommendations skip retrieval, send pre-filtered SQL top 10 instead |

**Chaos endpoint** (`POST /ops/chaos`) injects synthetic failures gated to admin + non-prod for the demo.

---

## 9. Observability

- **OpenTelemetry** SDK in API + Functions → Application Insights.
- Every request gets `traceparent`; every Service Bus message carries it forward; every audit row stores it.
- **SLO dashboards** in Azure Workbooks:
  - API p95 < 300ms (read), < 800ms (write)
  - AI recommendation p95 < 2.5s
  - Event lag (intake → SignalR delivered) p95 < 1.5s
  - Override rate < 25%
- **Alerts** (Action Groups → PagerDuty): error rate > 1% / 5min, DLQ depth > 0, OpenAI 429 rate > 5%, cost burn > 120% of daily budget.

---

## 10. Project Layout (.NET 8)

```
src/
  RetailFixIt.Api/                ASP.NET Core minimal API host
    Endpoints/                    one file per resource
    Middleware/                   Tenant, Idempotency, ProblemDetails
    Program.cs
  RetailFixIt.Application/        use-cases, MediatR handlers, validators (FluentValidation)
  RetailFixIt.Domain/             entities, value objects, domain events
  RetailFixIt.Infrastructure/     EF Core, Cosmos, Service Bus, Redis, AI clients
  RetailFixIt.Workers/            Azure Functions (AI, Outbox dispatcher, Eval, SignalR fanout)
  RetailFixIt.Contracts/          DTOs shared with OpenAPI generator
tests/
  Api.IntegrationTests/           WebApplicationFactory + Testcontainers (SQL, Redis, Azurite)
  Application.UnitTests/
  Workers.UnitTests/
infra/
  bicep/                          main.bicep + modules per service
  pipelines/                      GitHub Actions
```

Key NuGets: `MediatR`, `FluentValidation`, `Polly`, `Microsoft.SemanticKernel` (or raw `Azure.AI.OpenAI`), `Microsoft.Azure.Cosmos`, `Azure.Messaging.ServiceBus`, `Microsoft.Azure.SignalR`, `OpenTelemetry.AutoInstrumentation`, `QuestPDF`.

---

## 11. Frontend Wiring (already in place)

The SPA talks to a single interface in `src/lib/api/client.ts`. Backend handoff = implement these methods over HTTP:

```ts
login, me, logout
getDashboardMetrics
listJobs, getJob, createJob, updateJob, assignJob
listVendors, getVendor, updateVendor
listAssignments
getRecommendation, requestRecommendation, generateJobSummary
listAudit
listUsers
subscribe                          // SignalR hub `event` callback
```

To swap, create `HttpApi` and at the bottom of `client.ts`:

```ts
export const api: ApiClient = new HttpApi({
  baseUrl: import.meta.env.VITE_API_BASE,
  signalR: import.meta.env.VITE_SIGNALR_NEGOTIATE,
});
```

Required env vars (Static Web App → Configuration):
- `VITE_API_BASE` — `https://api.retailfixit.io/v1`
- `VITE_SIGNALR_NEGOTIATE` — `https://api.retailfixit.io/v1/realtime/negotiate`
- `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_TENANT`, `VITE_ENTRA_REDIRECT_URI`

---

## 12. Implementation Order (recommended)

1. **Infra**: Bicep for SQL, Redis, Service Bus, Cosmos, SignalR, Container Apps env, Key Vault, App Insights.
2. **Auth + Tenancy**: Entra, JWT validation, RLS, `/auth/me`.
3. **Jobs CRUD + Vendors CRUD** with outbox + audit.
4. **Service Bus + SignalR fanout** → realtime works end to end.
5. **AI Recommender Function** (with Polly + fallback).
6. **AI Governance, Eval, Feature Flags**.
7. **Observability + Health + Chaos endpoints**.
8. **PDF reports, CSV exports, webhooks**.
9. **Load test** with k6 (1k RPS read, 100 RPS write, 50 RPS AI). Tune.
10. **Pen-test pass + threat model review**, then prod.

---

## 13. Cost Optimization Notes

- Dashboard metrics: Redis cache 30s, materialized view refreshed by SQL Agent every 60s.
- AI: cache embeddings (Redis, key = sha256 of redacted text) — typical hit rate 35–50% on duplicate intakes.
- gpt-4o only for recommendations; gpt-4o-mini for everything else; embeddings batched (16 per call).
- Cosmos audit: autoscale 400→4000 RU/s; partition `/tenantId` keeps RU per query low.
- Container Apps: scale to zero on dev, min 2 replicas on prod (one per AZ).
- Front Door cache for `/healthz`, `/readyz`, static SPA assets.

---

End of spec. Anything not in this document is implementation-detail latitude for the backend engineer, but `ApiClient` shape and event names in §3 / §4 are the binding contract with the frontend.
