# RetailFixIt — Frontend (Operations SPA)

Production-minded React SPA for the RetailFixIt operations platform.
Backend (Azure SQL + Service Bus + SignalR + Azure OpenAI) is **not included** —
the frontend talks to a single typed `ApiClient` interface, currently fulfilled
by an in-memory mock. Swap the mock for an HTTP/SignalR client and the UI is
wired end-to-end.

## Stack

- **TanStack Start** (React 19 + Vite 7), file-based routing
- **TanStack Query** for server state + cache invalidation
- **Tailwind v4** with semantic design tokens (oklch) in `src/styles.css`
- **shadcn/ui** components
- **Recharts** for the dashboard
- **Sonner** for toast notifications

## Wiring the backend (the only thing left to do)

Everything the UI needs goes through one interface:

```ts
// src/lib/api/client.ts
export interface ApiClient {
  login, me, logout
  getDashboardMetrics
  listJobs, getJob, createJob, updateJob, assignJob
  listVendors, getVendor, updateVendor
  listAssignments
  getRecommendation, requestRecommendation, generateJobSummary
  listAudit
  listUsers
  subscribe(handler) // realtime — swap for SignalR
}
export const api: ApiClient = new MockApi();
```

To go live:

1. Create `src/lib/api/http-api.ts` implementing `ApiClient` — each method
   maps 1:1 to a REST endpoint or SignalR invocation. Method names already
   match the contract documented in `src/lib/types.ts`.
2. Replace the export at the bottom of `client.ts`:
   ```ts
   export const api: ApiClient = new HttpApi(import.meta.env.VITE_API_BASE);
   ```
3. Implement `subscribe()` with `@microsoft/signalr` against your hub. The
   `RealtimeEvent<T>` envelope already matches the Service Bus payload shape.
4. Auth: `MockApi.login()` returns `{ user, token }`. In `HttpApi`, exchange
   the Entra ID access token for `/me` and persist the bearer for fetches.
   `AuthProvider` already calls `api.me()` on mount.

No component imports the mock directly — they all go through the `api`
singleton, so the swap is one file.

## Real-time event contract

```ts
type RealtimeEventType =
  | "job.created" | "job.updated" | "job.assigned"
  | "ai.recommendation.ready"
  | "vendor.updated" | "audit.appended";

interface RealtimeEvent<T> {
  id: string;
  type: RealtimeEventType;
  tenantId: string;
  occurredAt: string;
  payload: T;
}
```

Components subscribe via `useRealtime(types, handler)` (see
`src/hooks/use-realtime.ts`). The mock emits a `job.updated` tick every 12s
to demonstrate the dashboard refreshing live.

## RBAC

`User.roles: Role[]` carries `admin | dispatcher | vendor_manager | support`.
`useAuth().hasRole(role)` is available to gate buttons or routes; the protected
layout `src/routes/_app.tsx` redirects unauthenticated users to `/login`.
Server-side role enforcement is the backend's responsibility — the UI mirrors
the same shape.

## Observability hooks (frontend side)

- `AIRecommendation` carries `latencyMs`, `confidence`, `fallbackUsed`,
  `modelVersion` and they are surfaced on the job detail panel.
- AI override flow captures a free-text reason and writes an audit entry
  with `action: "ai.recommendation.overridden"`.
- All mutations route through React Query so the caller can wire
  Application Insights via a global `QueryCache` listener if desired.

## Routes

```
/login                       public
/                            redirects to /dashboard (or /login)
/_app                        auth-gated layout (sidebar + header)
  /dashboard                 metrics, throughput, status mix, recent jobs
  /jobs                      paginated list + filters + create dialog
  /jobs/$jobId               detail, AI rec, assign, AI summary, timeline
  /vendors                   vendor directory with load + rating
  /assignments               human vs AI assignments
  /ai                        AI metrics + summarized jobs
  /audit                     append-only audit log (live)
  /users                     users + roles
  /settings                  tenant + AI governance toggles
```

## Demo accounts

The mock seeds four users; pick any from the login screen.

| Role            | Email                      |
|-----------------|----------------------------|
| Admin           | alex@retailfixit.com       |
| Dispatcher      | morgan@retailfixit.com     |
| Vendor manager  | sam@retailfixit.com        |
| Support         | jordan@retailfixit.com     |

Password is ignored by the mock.
