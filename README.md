# RetailFixIt — AI-Powered Retail Maintenance Dispatch Platform

Production-ready full-stack application for automated vendor dispatch with AI recommendations, real-time updates, and comprehensive audit trails.

**Live URLs:**
- Frontend: `http://localhost:3000` (dev) / Deployed to Netlify (prod)
- Backend: `https://api-retailfixit-dev.redplant-5c8db0a0.eastus.azurecontainerapps.io`
- Swagger: `https://api-retailfixit-dev.redplant-5c8db0a0.eastus.azurecontainerapps.io/swagger`

## Quick Start

```bash
# Install dependencies
npm install

# Run frontend (mock API - no backend needed)
npm run dev

# Or connect to deployed backend
VITE_API_BASE=https://api-retailfixit-dev.redplant-5c8db0a0.eastus.azurecontainerapps.io npm run dev
```

Login with `dispatch@retailfixit.com` / `dispatch123`

## Architecture

### Frontend Stack
- **Framework:** TanStack Start (React 19 + Vite 7) with file-based routing
- **State:** TanStack Query for server state + cache invalidation
- **Styling:** Tailwind v4 with semantic design tokens (oklch)
- **UI:** shadcn/ui components
- **Charts:** Recharts for metrics
- **Notifications:** Sonner toasts

### Backend Stack
- **Runtime:** .NET 8 Minimal API
- **Database:** Azure SQL + EF Core
- **Cache:** Redis (Azure Cache for Redis)
- **Real-time:** SignalR WebSockets
- **AI:** Azure OpenAI GPT-4o
- **Events:** Azure Service Bus
- **Auth:** JWT Bearer tokens
- **Hosting:** Azure Container Apps

## Key Features

### AI Vendor Recommendations
- GPT-4o analyzes 6 factors: category match, location, workload, rating, response time, cost
- Confidence scores (82-94%) with explanations
- Fallback to rule-based scoring if Azure quota exceeded

### Human-in-the-Loop Override
- Manual vendor selection tab
- Search and filter vendors
- Override reason captured for audit

### Real-Time Updates
- SignalR WebSocket connection
- Job status syncs across sessions
- Connection status indicator in header

### AI Governance
- Kill switch to disable AI recommendations
- Model versioning
- Category guardrails (HVAC, Electrical, Plumbing, General)

### Audit Logging
- Every assignment logged with: who, what, when, IP, user agent
- Redis cache for fast queries
- Service Bus for downstream SIEM integration

### Security
- JWT Bearer tokens (15min expiry)
- Role-based access (admin, dispatcher, vendor_manager, support)
- Row-level security via EF Core

## API Endpoints

```
POST   /v1/auth/login              # JWT login
GET    /v1/auth/me                  # Current user
POST   /v1/auth/logout              # Logout

GET    /v1/jobs                     # List with search, filters, pagination
POST   /v1/jobs                     # Create job
GET    /v1/jobs/{id}                # Get job details
PUT    /v1/jobs/{id}                # Update job
POST   /v1/jobs/{id}/assign         # Assign vendor (with audit)
GET    /v1/jobs/{id}/recommendation # AI vendor recommendations

GET    /v1/vendors                  # List vendors
GET    /v1/vendors/{id}             # Get vendor

GET    /v1/audit                    # Audit log (most recent first)
GET    /v1/assignments              # Assignment history
GET    /v1/users                    # Users list
GET    /v1/dashboard/metrics         # Dashboard stats

WS     /realtime                    # SignalR hub
```

**Query Parameters for /v1/jobs:**
- `?search=acme` - Search reference, title, customer, description
- `?status=assigned,completed` - Filter by status (comma-separated)
- `?priority=high,urgent` - Filter by priority
- `?category=HVAC` - Filter by category
- `?page=1&pageSize=20` - Pagination

## Deploy Backend

```powershell
cd backend/full-api

# Build and push
docker build -t retailfixit-backend:latest .
docker tag retailfixit-backend:latest retailfixitacrd5rteg4o2kv5q.azurecr.io/retailfixit-api:latest
az acr login --name retailfixitacrd5rteg4o2kv5q
docker push retailfixitacrd5rteg4o2kv5q.azurecr.io/retailfixit-api:latest

# Deploy to Azure Container Apps
az containerapp update `
  --name api-retailfixit-dev `
  --resource-group rg-retailfixit-dev `
  --image retailfixitacrd5rteg4o2kv5q.azurecr.io/retailfixit-api:latest
```

## Project Structure

```
src/
  components/
    common/              # Reusable UI (DetailSheets, DispatchPanel, etc.)
    ui/                  # shadcn components
  routes/
    _app.tsx             # Auth-gated layout
    _app/
      jobs.tsx           # Job list with filters
      jobs.$jobId.tsx    # Job detail + AI dispatch
      vendors.tsx        # Vendor directory
      ai.tsx             # AI governance
      audit.tsx          # Audit log
  lib/
    api/
      client.ts          # ApiClient interface
      http-api.ts        # HTTP implementation
    auth.tsx             # Auth context
  hooks/
    use-realtime.ts      # SignalR subscription

backend/full-api/
  Program.cs             # .NET 8 Minimal API
  Dockerfile             # Container build
```

## Tech Assessment Documents

- `LOOM_VIDEO_SCRIPT_CONDENSED.md` - 20-minute demo script
- `FEATURE_CHECKLIST.md` - Implementation status
- `SUBMISSION_SUMMARY.md` - Submission overview
- `PART3_ANSWERS.md` - Technical answers
- `src/Docs/SUBMISSION_KIT.md` - Full assessment kit

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | alex@retailfixit.com | dispatch123 |
| Dispatcher | morgan@retailfixit.com | dispatch123 |
| Vendor Manager | sam@retailfixit.com | dispatch123 |
| Support | jordan@retailfixit.com | dispatch123 |

**Test Flow:**
1. Login as dispatcher
2. Go to Jobs → Click any unassigned job
3. Click "Dispatch Vendor"
4. AI tab shows recommendations (3 vendors with scores)
5. Manual tab allows override
6. Assign vendor → toast confirmation
7. Check Audit Log → see assignment logged
