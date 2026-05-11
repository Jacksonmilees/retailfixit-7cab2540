# RetailFixIt — Submission Kit

Everything you need to hand in for the Full Stack Engineer assessment, plus a minute-by-minute Loom script.

---

## 1. What to Submit (checklist)

| # | Deliverable | Format | Source |
|---|---|---|---|
| 1 | Architecture write-up (1–2 pages) | PDF | Export the relevant sections of `BACKEND.md` (§1, §2, §6, §7, §9, §13) to PDF. Add the ASCII diagram from §1 redrawn in Excalidraw/draw.io as a PNG on page 1. |
| 2 | Frontend + backend repository | GitHub link | This Lovable project (Connect to GitHub from the **+** menu → GitHub → Connect project) plus your separate .NET backend repo. |
| 3 | README at the repo root | Markdown | Architecture overview, setup, example event flow, AI integration, performance notes. Use `BACKEND.md` §1, §6, §7, §11, §13. |
| 4 | IaC | `infra/bicep/` folder OR a deployment doc | Use the layout in `BACKEND.md` §10. If short on time, write a clear deployment doc instead of full Bicep. |
| 5 | Engineering Reasoning (Part 3) | PDF, 1–3 paragraphs per question | Four short answers — template in §4 below. |
| 6 | Loom walkthrough | 5–10 min video | Follow the script in §3 below. |
| 7 | (Bonus) AI eval / A/B / chaos / cost / flags notes | Appendix in PDF | One paragraph each — `BACKEND.md` already covers all of these (§7.4, §8, §13). |

---

## 2. Pre-Recording Setup (do this once before you hit Record)

1. Open the published preview URL in a clean Chrome window, hide bookmarks bar.
2. Sign in with the **demo Admin** account so you have full RBAC.
3. Open these tabs in order so Cmd+1..Cmd+9 jumps quickly:
   1. `/dashboard`
   2. `/jobs`
   3. `/jobs/<pick a job that has an assigned vendor and an AI rec>` — open it now and copy the URL
   4. `/assignments`
   5. `/audit`
   6. `/ai-governance`
   7. `/observability`
   8. `/health`
   9. `/rbac`
4. Open `BACKEND.md` in a second window (or a printout) — you'll show §1 diagram and §6 event flow on screen.
5. Test mic + screen recording in Loom for 10s. Use 1080p. Webcam bubble bottom-right.
6. Have a glass of water. Smile once before pressing record — it shows in your voice.

---

## 3. Loom Script (target 8 minutes; cap 10)

**Tone:** confident, conversational, no reading. Use the bullet phrasings as cues, not a teleprompter.

### 0:00 — 0:30  Intro (30s)

> "Hi — I'm <name>. I built RetailFixIt, an Azure-native, AI-assisted dispatch platform for ~1,000 vendors and four roles: dispatcher, vendor manager, admin, support. In the next ~8 minutes I'll cover the architecture, walk a job through the system end-to-end, show the AI loop and how it fails safely, then close with tradeoffs."

**Show:** the dashboard hero.

---

### 0:30 — 1:45  Architecture overview (75s)

**Switch to** the `BACKEND.md` §1 diagram (or your PNG).

> "Front Door fronts the SPA and APIM. APIM handles WAF, rate limit, and JWT. Behind it, an ASP.NET Core 8 API on Container Apps owns OLTP in Azure SQL with row-level security per tenant. Audit goes to Cosmos because it's append-only and high-write. Service Bus is the event backbone. SignalR Service pushes realtime to the SPA. Redis caches dashboards and holds idempotency keys. Azure OpenAI runs the AI workloads — `gpt-4o` for the recommender, `gpt-4o-mini` for summaries, embeddings into Azure AI Search for hybrid retrieval. Entra External ID for auth. App Insights with OpenTelemetry for traces, metrics, logs."

**Key sentence to land:** *"Tenancy is enforced in three places — JWT claim, EF Core interceptor that sets SQL session context, and SQL RLS policy. Defense in depth, not just RLS."*

---

### 1:45 — 3:30  Frontend flow: dashboard → job → dispatch (105s)

**Switch to** preview.

1. **Dashboard (10s)** — "Realtime metrics, paginated, SLA breaches, AI override rate. The dot in the header is the SignalR connection."
2. **Jobs list (15s)** — show search + filter + pagination. "Server-side filtering, query keys for cache invalidation."
3. **Open the job (20s)** — point at: reference, status, priority badge, AI complexity score, escalation risk, SLA countdown, customer + vendor info.
4. **Click the customer name → sheet opens (5s)** — "Per-tenant customer view, no PII leaks across tenants thanks to RLS."
5. **AI recommendation card (15s)** — "Top 3 ranked candidates, confidence, latency, model version pinned. Confidence under the floor flips to a `fallbackToHuman` flag."
6. **Click Dispatch → DispatchSheet (25s)** — pick the AI's top vendor OR override with a reason. "Override reasons are first-class — they feed the eval harness and the override-rate metric."
7. **Show optimistic UI (10s)** — assign, watch the badge update before the network round-trip completes; toast confirms.
8. **Switch to Assignments tab (5s)** — "Same job appears here in real time via SignalR — no refresh."

---

### 3:30 — 5:00  Event-driven flow + per-job timeline (90s)

**Back on** the job detail → **Timeline tab**.

> "This is the proof of the event-driven story. One correlation ID follows the job from intake to completion. You can see `job.created → ai.recommendation.requested → ai.recommendation.ready → job.assigned.{ai|human} → assignment.accepted → job.completed`, each with the same correlation ID and W3C trace ID."

**Show on screen:** point at the matching `cor_…` and `trace:` strings on multiple events.

> "Mechanically: every state change writes to the SQL outbox in the same transaction as the row change. A background dispatcher publishes those rows onto Service Bus topics. SignalR fanout, the AI worker, and the search indexer are independent subscribers. Failures dead-letter; the outbox guarantees at-least-once and we make handlers idempotent with the `Idempotency-Key` header."

---

### 5:00 — 6:15  AI integration + governance + audit diff (75s)

1. **`/ai-governance` (25s)** — "Model pinned to a specific snapshot, never `latest`. Prompt is versioned — I can promote v3.3, fall back to v3.2. PII redaction with Presidio is mandatory. Daily token budget enforced via Redis counter. The big red kill-switch routes every call to the deterministic rule-based ranker."
2. **Toggle the kill-switch (10s)** — go back to a job, request a recommendation. "Notice `fallbackUsed: true`. Same UI, degraded gracefully, override rate stays meaningful." Toggle it back.
3. **`/audit` (15s)** — "Append-only Cosmos, hash-chained for tamper-evidence — each row's hash includes the previous row's hash."
4. **Click an audit row (25s)** — "Field-level diff viewer: before/after with +/−/~ markers. The Metadata tab surfaces the correlation and trace IDs so I can pivot into App Insights and see the full distributed trace."

---

### 6:15 — 7:15  Failure modes — chaos demo (60s)

1. **`/health` (15s)** — "Live circuit-breaker status for OpenAI, SQL, SignalR, Service Bus, Redis. Green now."
2. **Toggle Chaos: AI timeout (15s)** — go back to a job, request a recommendation.
3. **Show the fallback (15s)** — "Polly opens the circuit after 5 failures in 30s, falls back to the rule-based ranker, surfaces `fallbackUsed: true` in the UI, and emits an `ops.health.changed` event so the banner appears across all dispatchers in this tenant."
4. **Toggle chaos off (5s)**.
5. **`/observability` (10s)** — point at p50/p95/p99, override rate, event lag, DLQ depth. "These are the SLOs I'd alert on."

---

### 7:15 — 7:45  Multi-tenancy + RBAC (30s)

**`/rbac`** — "Permissions matrix. Backend authoritative — this UI is just a mirror. Tenancy enforced at JWT, ORM session context, and SQL RLS. Cross-tenant access is impossible even with a forged ID in the URL because the SQL filter ignores it."

---

### 7:45 — 8:30  Tradeoffs + what I'd do next (45s)

> "Tradeoffs: Cosmos for audit costs more than SQL per GB but the append-only write pattern and partition by tenant make it the right tool. PTU on Azure OpenAI for prod is expensive but predictable — I'd start PAYG and graduate. SignalR Serverless keeps the cost story clean for ~1k vendors but I'd switch to dedicated above 10k concurrent.
>
> What's next: vision-based triage from photos with `gpt-4o`, full A/B harness for the recommender (already feature-flagged), and a vendor mobile app that hits the same `/webhooks/vendor/{id}` endpoint."

> "Thanks for watching."

**Stop recording.**

---

## 4. Part 3 Written Answers (paste into your PDF, edit to your voice)

### AI Autonomy & Governance
The recommender suggests, humans dispatch — autonomy is bounded by a confidence floor (default 0.6) below which the model returns `fallbackToHuman: true` and the UI hides the one-click accept. Every output is logged with model snapshot, prompt version, token counts, latency, and a correlation ID, and every override is a first-class audit event with a reason. Governance lives behind RBAC at `/ai-governance`: model pinning to specific snapshots (never `latest`), prompt versioning with promote/rollback, mandatory PII redaction via Presidio, a per-tenant daily token budget, and a global kill-switch that routes all traffic to a deterministic rule-based ranker. A nightly eval harness replays a 200-item golden set and tracks Top-1 accuracy, hallucination rate, and drift versus the prior run; A/B rollout for new prompt or model versions is gated by a feature flag with `RolloutPercent` bucketed on `hash(jobId)`.

### Performance & Latency Strategy
Read-path latency targets are p95 < 300ms via Redis caching of the dashboard aggregate (30s TTL) and a SQL materialized view refreshed every 60s. Write path is p95 < 800ms by writing to SQL and the outbox in a single transaction and pushing the slow work (AI, search indexing, SignalR fanout) onto Service Bus. The AI recommender targets p95 < 2.5s using `gpt-4o` with `max_tokens` 600, hybrid retrieval pre-filtered to 5 candidates, embeddings cached in Redis (35–50% hit rate on duplicate intakes), and a Polly timeout of 6s with circuit breaker and rule-based fallback. Realtime end-to-end (intake → SignalR delivered) targets p95 < 1.5s. Front Door caches static assets and `/healthz`. Container Apps autoscale on Service Bus depth via KEDA.

### Failure Modes & Degradation
Every external dependency has a typed degradation: Azure OpenAI timeout or 5xx → Polly circuit opens → rule-based ranker, `fallbackUsed: true` surfaced in the UI; Azure SQL transient → EF Core retry strategy (6 attempts, exponential); Service Bus down → outbox queues locally and drains on recovery, dispatchers see a "events delayed" banner via `ops.health.changed`; SignalR disconnect → SPA reconnects with backoff and refetches open queries; Redis down → cache bypass with a logged warning, idempotency degrades to best-effort; AI Search down → recommender skips retrieval and uses pre-filtered SQL top 10. Outbox + idempotency keys give at-least-once with effective exactly-once. A `/ops/chaos` admin endpoint injects synthetic failures gated to non-prod for live demonstrations.

### Multi-Tenancy & RBAC
Tenancy is enforced in three layers: the Entra-issued JWT carries `tid`, an EF Core `DbConnectionInterceptor` sets `SESSION_CONTEXT('TenantId')` on every connection, and SQL Row-Level Security policies filter and block on every table. Cross-tenant queries are impossible even with a forged path or body. Cosmos and Blob containers are partitioned and SAS-scoped per tenant. RBAC roles (`admin`, `dispatcher`, `vendor_manager`, `support`) and granular permissions are checked server-side via authorization policies; the frontend `/rbac` page is a mirror, never the source of truth. Admin-only chaos and governance endpoints are additionally guarded by environment policy. Audit log entries record actor, role, before/after, correlation ID, and a hash chained to the previous row for tamper evidence.

---

## 5. Recording Tips

- **Pace:** ~150 wpm. If you finish a section early, pause silently for 1s rather than padding.
- **Mouse:** move deliberately. Hover before you click; don't fly across the screen.
- **Don't read the UI** — explain *why* the thing exists. The reviewer can see the labels.
- **One re-take rule:** if you stumble in the first 30s, re-record. Anywhere later, keep going — perfection is suspicious.
- **Captions:** turn on Loom auto-captions before sharing.
- **Length:** if the recording lands at 9:30, ship it. If it crosses 11:00, cut the chaos demo to 30s.

---

## 6. Final Pre-Submit Checklist

- [ ] Loom video uploaded, captions on, link unlocked for the reviewer's domain
- [ ] GitHub repo public OR reviewer added as collaborator
- [ ] `README.md` at repo root with the five required sections
- [ ] `BACKEND.md` committed at repo root
- [ ] Architecture PDF (1–2 pages) — diagram on page 1, write-up on page 2
- [ ] Part 3 PDF (the four answers above)
- [ ] Live preview URL still working (Lovable Publish)
- [ ] Demo accounts work on the live URL
- [ ] One sentence at the top of your submission email: *"Loom: <link>. Repo: <link>. Docs: attached."*

You're ready.
