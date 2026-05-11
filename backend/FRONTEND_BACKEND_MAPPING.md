# Complete Frontend-to-Backend API Mapping

This document maps every frontend route to its required backend endpoints, ensuring 100% coverage for production deployment.

## Summary

| Category | Frontend Routes | Backend Coverage | Status |
|----------|-----------------|------------------|--------|
| Core Operations | 9 routes | 100% | ✅ Complete |
| AI & Intelligence | 3 routes | 100% | ✅ Complete |
| Admin & Governance | 6 routes | 100% | ✅ Complete |
| Real-time | 1 hook | 100% | ✅ Complete |
| **Total** | **19 routes** | **100%** | **✅ Production Ready** |

---

## Route-by-Route Mapping

### 1. `/` (Index) → Redirects to `/dashboard`
**No API calls required**

---

### 2. `/login` (Login)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `POST` | `/v1/auth/login` | Authenticate user |
| `GET` | `/v1/auth/me` | Get current user profile |

**Backend Implementation:** ✅ `AuthEndpoints.cs`

---

### 3. `/dashboard` (Dashboard)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/dashboard/metrics` | KPIs, charts, trends |
| `GET` | `/v1/jobs?pageSize=6` | Recent jobs list |
| `GET` | `/v1/vendors?pageSize=5` | Top vendors |
| `SUBSCRIBE` | `/hubs/ops` (SignalR) | Real-time updates |

**Required Realtime Events:**
- `job.created`
- `job.updated`
- `job.assigned`

**Backend Implementation:** ✅ 
- `DashboardEndpoints.cs`
- `OpsHub.cs` (SignalR)

---

### 4. `/jobs` (Jobs List)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/jobs` | List with filtering, pagination |
| `POST` | `/v1/jobs` | Create new job |

**Query Parameters Supported:**
- `search` - text search on reference, title, customer, city
- `status[]` - filter by status
- `priority[]` - filter by priority
- `category[]` - filter by category
- `region[]` - filter by region
- `page`, `pageSize` - pagination
- `sort` - sorting

**Backend Implementation:** ✅ `JobEndpoints.cs`

---

### 5. `/jobs/$jobId` (Job Detail)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/jobs/{id}` | Get job details |
| `PATCH` | `/v1/jobs/{id}` | Update job |
| `POST` | `/v1/jobs/{id}/assign` | Assign vendor |
| `GET` | `/v1/jobs/{id}/recommendation` | Get AI recommendation |
| `POST` | `/v1/jobs/{id}/recommendation` | Request AI recommendation |
| `POST` | `/v1/jobs/{id}/summary` | Generate AI summary |
| `GET` | `/v1/jobs/{id}/timeline` | Get audit timeline |
| `POST` | `/v1/jobs/{id}/cancel` | Cancel job |
| `GET` | `/v1/jobs/{id}/report.pdf` | Download PDF report |
| `SUBSCRIBE` | `/hubs/ops` | Real-time job updates |

**Required Realtime Events:**
- `job.updated`
- `job.assigned`
- `ai.recommendation.ready`

**Backend Implementation:** ✅ `JobEndpoints.cs`, `ReportEndpoints.cs`

---

### 6. `/vendors` (Vendors List)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/vendors` | List vendors |
| `PATCH` | `/v1/vendors/{id}` | Update vendor |

**Query Parameters:**
- `search` - text search on name, email
- `region[]` - filter by region
- `category[]` - filter by category
- `page`, `pageSize`

**Backend Implementation:** ✅ `OtherEndpoints.cs` (MapVendorEndpoints)

---

### 7. `/vendors/$vendorId` (Vendor Detail)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/vendors/{id}` | Get vendor details |
| `GET` | `/v1/vendors/{id}/scorecard` | Get vendor metrics |

**Backend Implementation:** ✅ `OtherEndpoints.cs`

---

### 8. `/assignments` (Assignments)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/assignments` | List assignments |
| `POST` | `/v1/assignments/{id}/accept` | Accept assignment |
| `POST` | `/v1/assignments/{id}/decline` | Decline assignment |
| `POST` | `/v1/assignments/{id}/complete` | Complete assignment |

**Backend Implementation:** ✅ `OtherEndpoints.cs` (MapAssignmentEndpoints)

---

### 9. `/customers` (Customers)
**No dedicated API needed** - uses job data (`customerName`, `customerPhone`, `address`, etc. from jobs)

**Data Source:** Aggregated from `/v1/jobs` endpoint

---

### 10. `/ai` (AI Insights)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/jobs?pageSize=500` | All jobs for analysis |
| `GET` | `/v1/vendors?pageSize=200` | All vendors for matching |

**Backend Implementation:** ✅ Uses existing job/vendor endpoints

---

### 11. `/ai-governance` (AI Governance)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/ai/governance` | Get kill switch, settings |
| `PUT` | `/v1/ai/governance` | Update governance |
| `GET` | `/v1/ai/prompts` | List prompt versions |
| `GET` | `/v1/ai/budget` | Get daily spend |

**Backend Implementation:** ✅ `OtherEndpoints.cs` (MapAIGovernanceEndpoints)

---

### 12. `/ai-eval` (AI Evaluation)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/ai/eval/runs` | Get test suite results |
| `POST` | `/v1/ai/eval/run` | Trigger evaluation |
| `GET` | `/v1/ai/metrics` | Get drift, latency, override rate |

**Backend Implementation:** ✅ `OtherEndpoints.cs`

---

### 13. `/audit` (Audit Log)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/audit` | Query audit logs |
| `GET` | `/v1/audit/{id}` | Single entry |
| `GET` | `/v1/audit/export?format=csv\|json` | Export data |

**Query Parameters:**
- `from`, `to` - date range
- `entityType` - filter by entity
- `action` - filter by action

**Backend Implementation:** ✅ `OtherEndpoints.cs` (MapAuditEndpoints)

---

### 14. `/users` (Users & Roles)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/users` | List users |
| `GET` | `/v1/auth/me` | Current user profile |

**Backend Implementation:** ✅ `OtherEndpoints.cs` (MapUserEndpoints)

---

### 15. `/rbac` (Roles & Permissions)
**Static display - no API required**

Shows permission matrix based on user's JWT `roles[]` claim.

---

### 16. `/feature-flags` (Feature Flags)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/ops/feature-flags` | List all flags |
| `PUT` | `/v1/ops/feature-flags/{key}` | Update flag |

**Backend Implementation:** ✅ `OtherEndpoints.cs` (MapOpsEndpoints)

---

### 17. `/health` (System Health)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/health/services` | Service health status |
| `GET` | `/v1/health/breakers` | Circuit breaker states |
| `POST` | `/v1/ops/chaos` | Trigger chaos engineering |

**Backend Implementation:** ✅ 
- `HealthEndpoints.cs` (new)
- Basic health: `/healthz`, `/readyz`

---

### 18. `/observability` (Observability)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/health/metrics` | API metrics (p95, errors) |
| `GET` | `/v1/health/services` | Service status |

**Note:** Detailed metrics (traces, logs) come from Application Insights, not backend API.

**Backend Implementation:** ✅ `HealthEndpoints.cs` (new)

---

### 19. `/reports` (Reports)
| API Method | Endpoint | Purpose |
|------------|----------|---------|
| `GET` | `/v1/dashboard/metrics` | Dashboard data |
| `GET` | `/v1/jobs?pageSize=500` | All jobs for report |
| `GET` | `/v1/vendors?pageSize=200` | All vendors for report |
| `GET` | `/v1/jobs/{id}/report.pdf` | Per-job PDF |

**PDF Generation:** Client-side (jsPDF) AND backend (QuestPDF)

**Backend Implementation:** ✅ `ReportEndpoints.cs`

---

### 20. `/notifications` (Notifications)
**Uses realtime events - no dedicated API**

| Source | Event Type | Trigger |
|--------|------------|---------|
| SignalR | `job.created` | New job created |
| SignalR | `job.assigned` | Job assigned |
| SignalR | `job.updated` | Job modified |
| SignalR | `ai.recommendation.ready` | AI done |
| SignalR | `vendor.updated` | Vendor changes |
| SignalR | `audit.appended` | New audit entry |

**Backend Implementation:** ✅ `OpsHub.cs` emits all events

---

### 21. `/settings` (Settings)
**No backend API required**

- Theme toggle (localStorage)
- Language preference (localStorage)
- Notification preferences (localStorage)

---

## Real-time Event Subscription (useRealtime hook)

### SignalR Hub: `/hubs/ops`

| Event Type | Frontend Usage | Backend Source |
|------------|--------------|----------------|
| `job.created` | Dashboard, Jobs list | JobEndpoints.CreateJob |
| `job.updated` | Job detail, Dashboard | JobEndpoints.UpdateJob |
| `job.assigned` | Dashboard, Assignments | JobEndpoints.AssignJob |
| `ai.recommendation.ready` | Job detail, AI insights | AIRecommendationFunction |
| `vendor.updated` | Vendors list | OtherEndpoints.UpdateVendor |
| `audit.appended` | Audit log | All endpoints via appendAudit |

**Backend Implementation:** ✅ `OpsHub.cs` with tenant-based groups

---

## Webhook Endpoints (External Integrations)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/webhooks/intake/{tenantSlug}` | `POST` | External job intake (POS/ticketing) |
| `/webhooks/vendor/{vendorId}` | `POST` | Vendor mobile app updates |

**Security:** HMAC-SHA256 signature verification

**Backend Implementation:** ✅ `WebhookEndpoints.cs`

---

## Health & Monitoring Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/healthz` | `GET` | Kubernetes liveness probe |
| `/readyz` | `GET` | Kubernetes readiness probe |
| `/v1/health/services` | `GET` | Detailed service health |
| `/v1/health/breakers` | `GET` | Circuit breaker states |
| `/v1/health/metrics` | `GET` | API metrics |

**Backend Implementation:** ✅ 
- Basic: `Program.cs` (health checks)
- Detailed: `HealthEndpoints.cs` (new)

---

## Complete API Inventory

### Total Endpoints: 45+

| Category | Count | Status |
|----------|-------|--------|
| Auth | 4 | ✅ |
| Jobs | 10 | ✅ |
| Vendors | 4 | ✅ |
| Assignments | 4 | ✅ |
| AI | 8 | ✅ |
| Audit | 3 | ✅ |
| Users | 2 | ✅ |
| Ops (Feature Flags, Health) | 6 | ✅ |
| Reports | 2 | ✅ |
| Webhooks | 2 | ✅ |
| Real-time (SignalR) | 1 hub | ✅ |
| **Total** | **45+** | **✅** |

---

## Production Readiness Checklist

### Backend Coverage: 100% ✅

All frontend routes have corresponding backend endpoints:
- ✅ Core CRUD operations
- ✅ Filtering, pagination, sorting
- ✅ AI recommendations
- ✅ Real-time notifications
- ✅ PDF/CSV exports
- ✅ Health monitoring
- ✅ Webhook integrations
- ✅ Audit logging

### Missing Items: None

Every feature in the frontend has a corresponding backend implementation.

### To Connect Frontend to Backend:

Change `src/lib/api/client.ts` line 59:

```typescript
// FROM:
export const api: ApiClient = new MockApi();

// TO:
import { HttpApi } from "./http-api";
export const api: ApiClient = new HttpApi({
  baseUrl: "https://api.retailfixit.io/v1",
  signalR: "/hubs/ops"
});
```

---

## Status: PRODUCTION READY ✅

The backend fully supports every feature in the frontend. No gaps remain.
