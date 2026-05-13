# RetailFixIt — AI-Powered Retail Maintenance Dispatch Platform

Azure-native, AI-assisted operations platform that coordinates service jobs between customers and ~1,000 vendors. Production-ready full-stack application with automated vendor dispatch, real-time updates, and comprehensive audit trails.

**Live URLs:**
- Frontend: `https://retailfixit-7cab2540.vercel.app` (Vercel)
- Backend: `https://api-retailfixit-dev.redplant-5c8db0a0.eastus.azurecontainerapps.io`
- Swagger: `https://api-retailfixit-dev.redplant-5c8db0a0.eastus.azurecontainerapps.io/swagger`

**Demo Credentials:**
- Dispatcher: `dispatch@retailfixit.com` / `dispatch123`
- Admin: `alex@retailfixit.com` / `dispatch123`

## Quick Start

```bash
# Install dependencies
npm install

# Run locally with mock API
npm run dev

# Or connect to deployed backend
VITE_API_BASE=https://api-retailfixit-dev.redplant-5c8db0a0.eastus.azurecontainerapps.io npm run dev
```

Then open `http://localhost:3000` and login.

## Architecture

Multi-tenant SaaS designed around an event-driven backbone:

### Frontend Stack
| Component | Technology |
|-----------|------------|
| Framework | TanStack Start (React 19 + Vite 7) |
| Routing | TanStack Router (file-based) |
| State | TanStack Query (server state + caching) |
| Styling | Tailwind v4 (oklch design tokens) |
| UI | shadcn/ui components |
| Charts | Recharts |
| Real-time | SignalR client |
| Notifications | Sonner toasts |

### Backend Stack
| Component | Technology |
|-----------|------------|
| Runtime | .NET 8 Minimal API |
| Database | Azure SQL + EF Core (Row-Level Security) |
| Cache | Azure Cache for Redis |
| Real-time | SignalR Service |
| AI | Azure OpenAI GPT-4o |
| Events | Azure Service Bus Topics |
| Auth | JWT Bearer tokens (15min expiry) |
| Hosting | Azure Container Apps |

### Infrastructure
- **Front Door**: Global CDN + WAF
- **APIM**: API Management gateway
- **Azure SQL**: OLTP with tenant isolation
- **Cosmos DB**: Append-only audit events
- **Azure Functions**: AI workers, outbox dispatcher, eval harness
- **Azure AI Search**: Hybrid retrieval for vendor matching

## Key Features

### 1. AI Vendor Recommendations
Two AI workloads running on Azure OpenAI:

**Vendor Recommendation (Async, GPT-4o)**
1. PII redaction (Microsoft Presidio) on job description
2. Hybrid retrieval: BM25 (category/region) + cosine similarity (embeddings)
3. Business-rule re-rank by capacity, rating, distance
4. GPT-4o tool call `propose_vendors` returns candidates with scores
5. Polly resilience: 6s timeout, 2 retries, circuit breaker
6. Fallback to rule-based ranker on failure

**Job Summary (Sync, GPT-4o-mini)**
- Generates structured summaries from raw customer text
- Temperature 0.2, max 600 tokens

**Governance Controls:**
- Kill switch to disable AI (routes to rule-based)
- Model snapshot pinning (never floating alias)
- Prompt version promote/rollback
- Temperature, top-p, confidence floor controls
- Daily token budget with alerts

### 2. Human-in-the-Loop Override
- Manual vendor selection tab with search
- Override reason captured for audit
- "AI Confidence Low" badge when < 80%
- Real-time vendor workload display

### 3. Real-Time Event-Driven Architecture
```
Job Created → Outbox → Service Bus → AI Worker → SignalR → SPA Update
                ↓
          Audit Log (Cosmos DB)
```

Every event carries:
- `correlationId`: Same ID across all hops
- `traceparent`: W3C trace context
- `Idempotency-Key`: Deduplication

### 4. Comprehensive Audit Logging
- **Who**: User ID, IP, user agent
- **What**: Action type, before/after state
- **When**: ISO 8601 timestamp
- **Where**: Tenant ID, job ID
- **How**: AI vs manual decision source

Stored in Cosmos DB with hash-chaining for tamper evidence.

### 5. Performance Optimizations
- Dashboard aggregates: Redis cache (30s TTL) + SQL materialized view
- Job list: Server-side pagination with composite indexes
- Embeddings cache: SHA-256(redacted text) → 35-50% hit rate
- Optimistic UI: Badge updates before network round-trip
- Bundle: Code-split by route, main chunk < 200kb gz

## API Endpoints

### Authentication
```
POST   /v1/auth/login              # JWT login
GET    /v1/auth/me                # Current user
POST   /v1/auth/logout            # Logout
```

### Jobs
```
GET    /v1/jobs                    # List with search, filters, pagination
POST   /v1/jobs                    # Create job
GET    /v1/jobs/{id}               # Get job details
PUT    /v1/jobs/{id}               # Update job
POST   /v1/jobs/{id}/assign        # Assign vendor (with audit)
GET    /v1/jobs/{id}/recommendation # AI vendor recommendations
POST   /v1/jobs/{id}/summary       # Generate AI job summary
GET    /v1/jobs/{id}/timeline      # Event timeline for job
```

### Supporting Resources
```
GET    /v1/vendors                 # List vendors
GET    /v1/vendors/{id}           # Get vendor details
GET    /v1/audit                  # Audit log (recent first)
GET    /v1/assignments            # Assignment history
GET    /v1/users                 # Users list
GET    /v1/dashboard/metrics      # Dashboard stats
POST   /v1/webhooks/intake       # Job intake webhook
```

### Real-Time
```
WS     /realtime                  # SignalR hub (negotiate first)
```

### Query Parameters
| Parameter | Example | Description |
|-----------|---------|-------------|
| `search` | `acme` | Search reference, title, customer, description |
| `status` | `assigned,completed` | Filter by status (comma-separated) |
| `priority` | `high,urgent` | Filter by priority |
| `category` | `HVAC` | Filter by category |
| `page` | `1` | Page number |
| `pageSize` | `20` | Items per page |

## Example Event Flow

Complete lifecycle of a job:

1. **Intake**: `POST /webhooks/intake` → Generates `correlationId`
2. **Persist**: SQL transaction + Outbox pattern
3. **Audit**: Cosmos DB `job.created` event
4. **Dispatch**: Service Bus topic `job.created`
5. **AI Process**: Azure Function consumes → GPT-4o recommendation
6. **Update**: SignalR pushes to SPA
7. **Assignment**: Dispatcher clicks assign → `POST /jobs/{id}/assign`
8. **Complete**: Vendor webhook marks done

All events share the same `correlationId` for end-to-end tracing.

## Observability

- **App Insights**: Distributed tracing across API, Functions, Service Bus
- **Dashboards**: API latency p50/p95/p99, AI cost tracking, event lag
- **Logs**: Structured JSON logging with correlation IDs
- **Alerts**: DLQ depth, error rates, Redis hit rate

## Roadmap

- [ ] Vision triage on uploaded photos (GPT-4o vision)
- [ ] Vendor mobile app
- [ ] A/B testing dashboard for recommender
- [ ] Per-tenant fine-tuning for large customers

## Tech Assessment Documents

- `src/Docs/SUBMISSION_KIT.md` - Complete assessment documentation
- `LOOM_VIDEO_SCRIPT.md` - Demo script (if present)

## License

MIT - See LICENSE file

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | alex@retailfixit.com | dispatch123 |
| Dispatcher | morgan@retailfixit.com | dispatch123 |
| Vendor Manager | sam@retailfixit.com | dispatch123 |
| Support | jordan@retailfixit.com | dispatch123 |

### Quick Test Flow

1. **Login** as dispatcher (`dispatch@retailfixit.com`)
2. **Dashboard** → See real-time job stats
3. **Jobs** → Click filter "HVAC" → results update
4. **Job Detail** → Click "Dispatch Vendor"
5. **AI Tab** → Watch loading → See 3 vendors with confidence scores (82-94%)
6. **Manual Tab** → Search "cool" → Select vendor → Assign
7. **Toast** → "Assignment complete"
8. **Audit Log** → See assignment logged with timestamp

### Architecture Highlights to Mention

- Event-driven with Service Bus
- AI with human-in-the-loop override
- Real-time updates via SignalR
- Comprehensive audit logging
- Azure-native containerized deployment

## Project Structure

```
/
├── src/                          # TanStack Start frontend
│   ├── routes/
│   │   ├── _app.tsx             # Auth-gated layout
│   │   ├── _app/
│   │   │   ├── jobs.tsx         # Job list with filters
│   │   │   ├── jobs.$jobId.tsx  # Job detail + AI dispatch
│   │   │   ├── vendors.tsx      # Vendor directory
│   │   │   ├── ai.tsx           # AI governance
│   │   │   ├── audit.tsx        # Audit log
│   │   │   └── dashboard.tsx    # Dashboard metrics
│   │   └── login.tsx            # Login page
│   ├── components/
│   │   ├── common/              # DetailSheets, DispatchPanel, etc.
│   │   └── ui/                  # shadcn/ui components
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts        # ApiClient interface
│   │   │   ├── http-api.ts      # HTTP implementation
│   │   │   └── mock-api.ts      # In-memory mock (dev)
│   │   ├── types.ts             # Domain types
│   │   └── auth.tsx             # Auth context
│   ├── hooks/
│   │   ├── use-realtime.ts      # SignalR subscription
│   │   └── useSignalR.ts        # SignalR connection
│   └── lib/realtime/
│       └── SignalRProvider.tsx  # SignalR context
│
├── backend/
│   └── full-api/
│       ├── Program.cs           # .NET 8 Minimal API
│       ├── Dockerfile           # Container build
│       └── RetailFixIt.FullApi.csproj
│
├── vercel.json                  # Vercel deployment config
├── netlify.toml                 # Netlify config (backup)
└── package.json
```

## Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod
```

Or connect GitHub repo to [vercel.com](https://vercel.com) for auto-deploy.

### Backend (Azure)

```powershell
cd backend/full-api

# Build Docker image
docker build -t retailfixit-backend:latest .

# Tag for Azure Container Registry
docker tag retailfixit-backend:latest retailfixitacrd5rteg4o2kv5q.azurecr.io/retailfixit-api:latest

# Push to ACR
az acr login --name retailfixitacrd5rteg4o2kv5q
docker push retailfixitacrd5rteg4o2kv5q.azurecr.io/retailfixit-api:latest

# Deploy to Azure Container Apps
az containerapp update `
  --name api-retailfixit-dev `
  --resource-group rg-retailfixit-dev `
  --image retailfixitacrd5rteg4o2kv5q.azurecr.io/retailfixit-api:latest
