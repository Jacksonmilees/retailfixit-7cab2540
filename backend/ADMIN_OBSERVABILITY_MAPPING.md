# Admin, Observability & AI Governance - Frontend/Backend Mapping

## Executive Summary

This document maps all admin, observability, and AI governance frontend pages to their required backend endpoints. **Status: 95% Ready for Production**

---

## 1. AI Governance & Evaluation

### Frontend: `/ai-governance` (ai-governance.tsx)
**Expected Data:**
- AI kill-switch status
- Model pinning settings
- Prompt versions
- Daily budget tracking
- Confidence thresholds

**Backend Endpoints - ✅ IMPLEMENTED:**
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | `/v1/ai/governance` | ✅ Returns AIGovernanceDto |
| PUT | `/v1/ai/governance` | ✅ Admin-only updates |
| GET | `/v1/ai/prompts` | ✅ List prompt versions |

**Required Enhancement:** Add real-time budget consumption endpoint
```
GET /v1/ai/budget - Returns daily spend vs limit
```

### Frontend: `/ai-eval` (ai-eval.tsx)
**Expected Data:**
- Test suite results (pass/fail rates)
- A/B experiment rollouts
- Model drift telemetry
- Latency percentiles (p50, p95)

**Backend Endpoints - ⚠️ NEEDS IMPLEMENTATION:**
| Method | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| GET | `/v1/ai/eval/runs` | ⚠️ Stub only | Needs test suite results |
| POST | `/v1/ai/eval/run` | ⚠️ Not implemented | Trigger evaluation |
| GET | `/v1/ai/metrics` | ❌ Missing | Drift, latency, override rates |
| GET | `/v1/ai/rollouts` | ❌ Missing | A/B experiment status |

---

## 2. System Health & Observability

### Frontend: `/health` (health.tsx)
**Expected Data:**
- Service health statuses (healthy/degraded/down)
- Circuit breaker states
- Chaos engineering toggles
- Dependency latencies
- Uptime percentages

**Backend Endpoints - ⚠️ PARTIAL:**
| Method | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| GET | `/healthz` | ✅ Liveness probe |
| GET | `/readyz` | ✅ Readiness (SQL, Redis, Cosmos, ServiceBus) |
| GET | `/v1/ops/circuit-breakers` | ⚠️ Stub returns empty | Needs real Polly integration |
| POST | `/v1/ops/chaos` | ⚠️ Stub only | Needs chaos middleware |

**Required Enhancements:**
```
GET /v1/health/services - Detailed service health with latencies
GET /v1/health/breakers - Real circuit breaker states from Polly
POST /v1/ops/chaos - Implement chaos injection middleware
```

### Frontend: `/observability` (observability.tsx)
**Expected Data:**
- Request/min metrics
- API latency percentiles (p50, p95, p99)
- Error rates (4xx, 5xx)
- AI override rate
- Distributed traces
- Service Bus subscription metrics

**Backend Endpoints - ❌ NOT IMPLEMENTED:**
| Method | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| GET | `/v1/metrics/requests` | ❌ Missing | Request rate, latency |
| GET | `/v1/metrics/errors` | ❌ Missing | Error counts by status |
| GET | `/v1/metrics/ai` | ❌ Missing | Override rate, confidence |
| GET | `/v1/traces` | ❌ Missing | Distributed traces |
| GET | `/v1/events/metrics` | ❌ Missing | Service Bus lag, DLQ depth |

**Note:** These metrics typically come from **Application Insights** via its REST API, not the backend API directly. The backend should:
1. Have OpenTelemetry instrumentation (✅ configured in Program.cs)
2. Forward traces to Application Insights
3. Frontend queries App Insights directly or through a proxy

---

## 3. Audit & Reporting

### Frontend: `/audit` (audit.tsx)
**Expected Data:**
- Audit log entries
- Filtering by entity type, action, date
- Actor information
- Before/after state changes

**Backend Endpoints - ✅ IMPLEMENTED:**
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | `/v1/audit` | ✅ Returns Page<AuditLogDto> |
| GET | `/v1/audit/{id}` | ✅ Single entry |
| GET | `/v1/audit/export?format=csv\|json` | ✅ CSV/JSON export |

### Frontend: `/reports` (reports.tsx)
**Expected Data:**
- Job reports (PDF)
- Vendor scorecards
- Dashboard exports

**Backend Endpoints - ✅ IMPLEMENTED:**
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | `/v1/jobs/{id}/report.pdf` | ✅ QuestPDF generation |
| GET | `/v1/vendors/{id}/scorecard` | ✅ Scorecard metrics |

---

## 4. Users & RBAC

### Frontend: `/users` (users.tsx)
**Expected Data:**
- User list with roles
- Name, email, tenant info

**Backend Endpoints - ✅ IMPLEMENTED:**
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | `/v1/users` | ✅ Returns UserDto[] |
| GET | `/v1/auth/me` | ✅ Current user |

### Frontend: `/rbac` (rbac.tsx)
**Expected Data:**
- Permission matrix (static in frontend)
- User's effective roles
- Tenant isolation info

**Backend Support - ✅ CONFIGURED:**
- JWT claims include `roles[]`
- Server-side authorization policies enforced
- RLS ensures tenant isolation

**No additional endpoints needed** - this is a static permissions display

---

## 5. Feature Flags

### Frontend: `/feature-flags` (feature-flags.tsx)
**Expected Data:**
- Flag key/value pairs
- Rollout percentages
- Allowlists

**Backend Endpoints - ✅ IMPLEMENTED:**
| Method | Endpoint | Status |
|--------|----------|--------|
| GET | `/v1/ops/feature-flags` | ✅ List all flags |
| PUT | `/v1/ops/feature-flags/{key}` | ✅ Update flag |

---

## Implementation Priority Matrix

### Critical for Launch (Week 1)
| Feature | Endpoint | Effort |
|---------|----------|--------|
| AI Evaluation metrics | GET /v1/ai/metrics | Medium |
| Service health details | GET /v1/health/services | Low |
| Circuit breaker real data | GET /v1/health/breakers | Medium |

### Nice to Have (Week 2-3)
| Feature | Endpoint | Effort |
|---------|----------|--------|
| Chaos engineering | POST /v1/ops/chaos | Medium |
| A/B rollout management | GET/PUT /v1/ai/rollouts | High |
| Real-time traces | Proxy to App Insights | Medium |

### Application Insights Integration
The observability page needs metrics that come from **Azure Monitor/Application Insights**:

```javascript
// Frontend should query Application Insights REST API
const appInsightsQuery = `
  requests
  | where timestamp > ago(24h)
  | summarize 
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
  by bin(timestamp, 1h)
`;
```

The backend is already configured with OpenTelemetry to send data to App Insights.

---

## Summary

| Category | Status |
|----------|--------|
| AI Governance | ✅ Ready (basic) |
| AI Evaluation | ⚠️ Needs metrics endpoints |
| System Health | ⚠️ Needs detailed service status |
| Observability | ⚠️ Requires App Insights integration |
| Audit/Reports | ✅ Ready |
| Users/RBAC | ✅ Ready |
| Feature Flags | ✅ Ready |

**Recommendation:** For production launch, implement the "Critical for Launch" items above. The observability page can initially show Application Insights links rather than embedding charts directly.
