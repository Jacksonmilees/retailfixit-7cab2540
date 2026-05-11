# RetailFixIt Backend

Production-grade .NET 8 backend for the RetailFixIt operations platform, implementing the complete API contract specified in `BACKEND.md`.

## Architecture

This backend follows Clean Architecture principles with the following layers:

```
src/
├── RetailFixIt.Domain/           # Entities, Enums, Domain Events
├── RetailFixIt.Contracts/        # DTOs for API contracts
├── RetailFixIt.Application/    # Use cases, MediatR handlers, Validators
├── RetailFixIt.Infrastructure/ # EF Core, Cosmos, Service Bus, Redis, OpenAI
├── RetailFixIt.Api/            # ASP.NET Core API, Endpoints, SignalR
└── RetailFixIt.Workers/        # Azure Functions (AI, Outbox, Eval)
```

## Technology Stack

- **.NET 8** - Runtime
- **EF Core 8** - SQL Server ORM with Row-Level Security
- **Azure SQL** - Primary database with RLS for multi-tenancy
- **Cosmos DB** - Audit log storage with append-only design
- **Azure Service Bus** - Event-driven messaging
- **Redis** - Cache, idempotency, rate limiting
- **SignalR** - Real-time updates to SPA
- **Azure OpenAI** - GPT-4o for vendor recommendations
- **JWT** - Authentication with Entra External ID ready

## Quick Start

### Prerequisites

- .NET 8 SDK
- SQL Server (LocalDB or full instance)
- Redis (optional, can run without)
- Azure Cosmos DB Emulator (optional)

### Database Setup

1. Run the schema script:
```bash
cd infra/sql
sqlcmd -S localhost -d master -i schema.sql
```

2. Or use EF Core migrations (when added):
```bash
cd src/RetailFixIt.Api
dotnet ef database update
```

### Run the API

```bash
cd src/RetailFixIt.Api
dotnet run
```

The API will be available at `https://localhost:7001` (or `http://localhost:5001`).

### API Endpoints

| Resource | Endpoint | Auth |
|----------|----------|------|
| Auth | POST /v1/auth/login | Anonymous |
| Auth | GET /v1/auth/me | Required |
| Dashboard | GET /v1/dashboard/metrics | Required |
| Jobs | GET /v1/jobs | Required |
| Jobs | POST /v1/jobs | jobs:create |
| Jobs | PATCH /v1/jobs/{id} | Required |
| Jobs | POST /v1/jobs/{id}/assign | jobs:assign |
| Jobs | GET /v1/jobs/{id}/recommendation | Required |
| Vendors | GET /v1/vendors | Required |
| Vendors | PATCH /v1/vendors/{id} | vendors:manage |
| Assignments | GET /v1/assignments | Required |
| AI | GET /v1/ai/governance | Required |
| AI | PUT /v1/ai/governance | ai:governance |
| Audit | GET /v1/audit | Required |
| Health | GET /healthz | Anonymous |

### SignalR Real-time

Connect to `/hubs/ops` for real-time events:
- `job.created`
- `job.updated`
- `job.assigned`
- `ai.recommendation.ready`
- `vendor.updated`
- `audit.appended`

## Configuration

Update `appsettings.json` or use environment variables:

| Setting | Environment Variable | Description |
|---------|---------------------|-------------|
| SqlServer | ConnectionStrings__SqlServer | Azure SQL connection |
| Redis | ConnectionStrings__Redis | Redis connection |
| Cosmos Endpoint | Cosmos__Endpoint | Cosmos DB endpoint |
| Cosmos Key | Cosmos__Key | Cosmos DB key |
| ServiceBus | ServiceBus__ConnectionString | Service Bus connection |
| OpenAI Endpoint | OpenAI__Endpoint | Azure OpenAI endpoint |
| OpenAI Key | OpenAI__Key | Azure OpenAI key |
| JWT Key | Jwt__Key | JWT signing key |

## Multi-tenancy (RLS)

The backend uses SQL Server Row-Level Security:
- Every JWT contains a `tid` (tenant ID) claim
- Middleware sets `SESSION_CONTEXT('TenantId')` per request
- All queries automatically filter by tenant

## Testing

```bash
# Run all tests
dotnet test

# Run integration tests only
dotnet test tests/RetailFixIt.Api.IntegrationTests

# Run unit tests only
dotnet test tests/RetailFixIt.Application.UnitTests
```

## Deployment

### Azure Container Apps

```bash
# Build container
docker build -t retailfixit-api -f src/RetailFixIt.Api/Dockerfile .

# Push to ACR and deploy to Container Apps
```

### Configuration for Production

- Use Managed Identity for SQL, Cosmos, Service Bus
- Store secrets in Azure Key Vault
- Use Azure App Configuration for feature flags
- Enable Application Insights for observability

## Project Status

### Implemented
- [x] Project structure and solution
- [x] Domain layer (Entities, Enums, Events)
- [x] Contracts layer (All DTOs)
- [x] Infrastructure layer (EF Core, Redis, Cosmos, Service Bus, OpenAI)
- [x] API layer (All endpoints per BACKEND.md spec)
- [x] SQL schema with RLS
- [x] SignalR hub for real-time
- [x] Middleware (Tenant, Idempotency, ProblemDetails)
- [x] JWT authentication

### Remaining
- [ ] Azure Functions Workers (AI recommender, Outbox dispatcher)
- [ ] Integration tests with Testcontainers
- [ ] Bicep/Terraform infrastructure templates
- [ ] MediatR handlers (currently logic in endpoints)
- [ ] FluentValidation rules
- [ ] PDF generation with QuestPDF
- [ ] CSV export
- [ ] Webhook endpoints with HMAC verification

## Integration with Frontend

The frontend (`src/lib/api/client.ts`) expects:
- Base URL: `https://api.retailfixit.io/v1`
- SignalR: `/hubs/ops`
- JWT in Authorization header
- `Idempotency-Key` for mutating requests

To connect the frontend:
1. Set `VITE_API_BASE=https://localhost:7001/v1` (or deployed URL)
2. Update `src/lib/api/client.ts` to use `HttpApi` instead of `MockApi`
3. Configure Entra ID or use the demo JWT login

## License

Internal use only - RetailFixIt Operations Platform
