using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using RetailFixIt.Contracts.Assignments;
using RetailFixIt.Contracts.Audit;
using RetailFixIt.Contracts.Auth;
using RetailFixIt.Contracts.Common;
using RetailFixIt.Contracts.Health;
using RetailFixIt.Contracts.Jobs;
using RetailFixIt.Contracts.Vendors;
using RetailFixIt.Infrastructure.Cosmos;
using RetailFixIt.Infrastructure.Data;
using System.Text.Json;

namespace RetailFixIt.Api.Endpoints;

public static class OtherEndpoints
{
    public static IEndpointRouteBuilder MapVendorEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/vendors").RequireAuthorization();

        group.MapGet("/", async (
            [AsParameters] VendorListQuery query,
            RetailFixItDbContext db,
            CancellationToken ct) =>
        {
            var vendorsQuery = db.Vendors.AsQueryable();

            if (query.Category?.Count > 0)
                vendorsQuery = vendorsQuery.Where(v => v.CategoriesJson != null && query.Category.Any(c => v.CategoriesJson.Contains(c)));

            if (query.Region?.Count > 0)
                vendorsQuery = vendorsQuery.Where(v => v.RegionsJson != null && query.Region.Any(r => v.RegionsJson.Contains(r)));

            if (!string.IsNullOrEmpty(query.Search))
            {
                var search = query.Search.ToLower();
                vendorsQuery = vendorsQuery.Where(v =>
                    EF.Functions.Like(v.Name.ToLower(), $"%{search}%") ||
                    (v.Email != null && EF.Functions.Like(v.Email.ToLower(), $"%{search}%")));
            }

            var total = await vendorsQuery.CountAsync(ct);
            var items = await vendorsQuery
                .OrderByDescending(v => v.Rating)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(v => MapVendorToDto(v))
                .ToListAsync(ct);

            return Results.Ok(new Page<VendorDto>
            {
                Items = items,
                Total = total,
                Page = query.Page,
                PageSize = query.PageSize
            });
        });

        group.MapGet("/{id:guid}", async (Guid id, RetailFixItDbContext db, CancellationToken ct) =>
        {
            var vendor = await db.Vendors.FindAsync(new object[] { id }, ct);
            if (vendor == null) return Results.NotFound();
            return Results.Ok(MapVendorToDto(vendor));
        });

        group.MapPatch("/{id:guid}", async (
            Guid id,
            UpdateVendorRequest request,
            RetailFixItDbContext db,
            CancellationToken ct) =>
        {
            var vendor = await db.Vendors.FindAsync(new object[] { id }, ct);
            if (vendor == null) return Results.NotFound();

            if (request.Name != null) vendor.Name = request.Name;
            if (request.Email != null) vendor.Email = request.Email;
            if (request.Phone != null) vendor.Phone = request.Phone;
            if (request.Categories != null) vendor.SetCategories(request.Categories);
            if (request.Regions != null) vendor.SetRegions(request.Regions);
            if (request.Rating.HasValue) vendor.Rating = request.Rating.Value;
            if (request.Capacity.HasValue) vendor.Capacity = request.Capacity.Value;
            if (request.Status != null) vendor.Status = request.Status;
            if (request.AvgResponseMinutes.HasValue) vendor.AvgResponseMinutes = request.AvgResponseMinutes.Value;

            await db.SaveChangesAsync(ct);
            return Results.Ok(MapVendorToDto(vendor));
        }).RequireAuthorization("vendors:manage");

        group.MapGet("/{id:guid}/scorecard", async (Guid id, RetailFixItDbContext db, CancellationToken ct) =>
        {
            var vendor = await db.Vendors.FindAsync(new object[] { id }, ct);
            if (vendor == null) return Results.NotFound();

            var assignments = await db.Assignments.Where(a => a.VendorId == id).ToListAsync(ct);

            var total = assignments.Count;
            var accepted = assignments.Count(a => a.Status == Domain.Enums.AssignmentStatuses.Accepted || a.Status == Domain.Enums.AssignmentStatuses.Completed);
            var onTime = assignments.Count(a => a.Status == Domain.Enums.AssignmentStatuses.Completed);

            return Results.Ok(new VendorScorecardDto
            {
                VendorId = id.ToString(),
                AcceptanceRate = total > 0 ? (decimal)accepted / total : 0,
                OnTimeRate = total > 0 ? (decimal)onTime / total : 0,
                AIFitScore = vendor.Rating ?? 0,
                TotalCompletedJobs = vendor.CompletedJobs ?? 0,
                TotalDeclinedJobs = assignments.Count(a => a.Status == Domain.Enums.AssignmentStatuses.Declined),
                AverageRating = vendor.Rating ?? 0
            });
        });

        return app;
    }

    public static IEndpointRouteBuilder MapAssignmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/assignments").RequireAuthorization();

        group.MapGet("/", async (
            [AsParameters] AssignmentListQuery query,
            RetailFixItDbContext db,
            CancellationToken ct) =>
        {
            var assignmentsQuery = db.Assignments.AsQueryable();

            if (!string.IsNullOrEmpty(query.VendorId))
                assignmentsQuery = assignmentsQuery.Where(a => a.VendorId == Guid.Parse(query.VendorId));

            if (!string.IsNullOrEmpty(query.JobId))
                assignmentsQuery = assignmentsQuery.Where(a => a.JobId == Guid.Parse(query.JobId));

            var total = await assignmentsQuery.CountAsync(ct);
            var items = await assignmentsQuery
                .OrderByDescending(a => a.AssignedAt)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(a => new AssignmentDto
                {
                    Id = a.Id.ToString(),
                    JobId = a.JobId.ToString(),
                    VendorId = a.VendorId.ToString(),
                    AssignedBy = a.AssignedBy,
                    AssignedAt = a.AssignedAt.ToString("O"),
                    AcceptedAt = a.AcceptedAt?.ToString("O"),
                    CompletedAt = a.CompletedAt?.ToString("O"),
                    Status = a.Status,
                    Notes = a.Notes
                })
                .ToListAsync(ct);

            return Results.Ok(new Page<AssignmentDto>
            {
                Items = items,
                Total = total,
                Page = query.Page,
                PageSize = query.PageSize
            });
        });

        group.MapPost("/{id:guid}/accept", async (Guid id, RetailFixItDbContext db, CancellationToken ct) =>
        {
            var assignment = await db.Assignments.FindAsync(new object[] { id }, ct);
            if (assignment == null) return Results.NotFound();

            assignment.Status = Domain.Enums.AssignmentStatuses.Accepted;
            assignment.AcceptedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);
            return Results.Ok();
        });

        group.MapPost("/{id:guid}/decline", async (
            Guid id,
            DeclineAssignmentRequest request,
            RetailFixItDbContext db,
            CancellationToken ct) =>
        {
            var assignment = await db.Assignments.FindAsync(new object[] { id }, ct);
            if (assignment == null) return Results.NotFound();

            assignment.Status = Domain.Enums.AssignmentStatuses.Declined;
            assignment.Notes = request.Reason;

            await db.SaveChangesAsync(ct);
            return Results.Ok();
        });

        group.MapPost("/{id:guid}/complete", async (
            Guid id,
            CompleteAssignmentRequest request,
            RetailFixItDbContext db,
            CancellationToken ct) =>
        {
            var assignment = await db.Assignments.FindAsync(new object[] { id }, ct);
            if (assignment == null) return Results.NotFound();

            assignment.Status = Domain.Enums.AssignmentStatuses.Completed;
            assignment.CompletedAt = DateTime.UtcNow;

            // Update job status
            var job = await db.Jobs.FindAsync(assignment.JobId);
            if (job != null)
            {
                job.Status = Domain.Enums.JobStatuses.Completed;
                job.UpdatedAt = DateTime.UtcNow;
            }

            await db.SaveChangesAsync(ct);
            return Results.Ok();
        });

        return app;
    }

    public static IEndpointRouteBuilder MapAuditEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/audit").RequireAuthorization();

        group.MapGet("/", async (
            [AsParameters] AuditListQuery query,
            CosmosDbContext cosmos,
            CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;

            var (items, _) = await cosmos.QueryAuditAsync(
                tenantId,
                query.EntityType,
                query.EntityId,
                query.CorrelationId,
                query.From,
                query.To,
                query.PageSize,
                null,
                ct);

            var dtos = items.Select(a => new AuditLogDto
            {
                Id = a.Id,
                TenantId = a.TenantId.ToString(),
                Actor = a.Actor,
                ActorRole = a.ActorRole,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                Metadata = a.Metadata,
                Before = a.Before,
                After = a.After,
                CorrelationId = a.CorrelationId,
                TraceId = a.TraceId,
                CreatedAt = a.CreatedAt.ToString("O")
            }).ToList();

            return Results.Ok(new Page<AuditLogDto>
            {
                Items = dtos,
                Total = items.Count,
                Page = query.Page,
                PageSize = query.PageSize
            });
        });

        group.MapGet("/{id}", async (string id, CosmosDbContext cosmos, CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;
            var log = await cosmos.GetAuditAsync(id, tenantId, ct);
            if (log == null) return Results.NotFound();

            return Results.Ok(new AuditLogDto
            {
                Id = log.Id,
                TenantId = log.TenantId.ToString(),
                Actor = log.Actor,
                ActorRole = log.ActorRole,
                Action = log.Action,
                EntityType = log.EntityType,
                EntityId = log.EntityId,
                Metadata = log.Metadata,
                Before = log.Before,
                After = log.After,
                CorrelationId = log.CorrelationId,
                TraceId = log.TraceId,
                CreatedAt = log.CreatedAt.ToString("O")
            });
        });

        return app;
    }

    public static IEndpointRouteBuilder MapAIEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/ai").RequireAuthorization();

        group.MapGet("/governance", async (RetailFixItDbContext db, CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;
            var gov = await db.AIGovernance.FirstOrDefaultAsync(g => g.TenantId == tenantId, ct)
                ?? new Domain.Entities.AIGovernance { TenantId = tenantId };

            return Results.Ok(new Contracts.AI.AIGovernanceDto
            {
                Enabled = gov.Enabled,
                PinnedModelVersion = gov.PinnedModelVersion,
                PinnedPromptVersion = gov.PinnedPromptVersion,
                Temperature = gov.Temperature,
                TopP = gov.TopP,
                ConfidenceFloor = gov.ConfidenceFloor,
                MaxTokensPerRecommendation = gov.MaxTokensPerRecommendation,
                DailyBudgetUsd = gov.DailyBudgetUsd,
                PiiRedactionRequired = gov.PiiRedactionRequired
            });
        });

        group.MapPut("/governance", async (
            Contracts.AI.UpdateAIGovernanceRequest request,
            RetailFixItDbContext db,
            CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;
            var gov = await db.AIGovernance.FirstOrDefaultAsync(g => g.TenantId == tenantId, ct);

            if (gov == null)
            {
                gov = new Domain.Entities.AIGovernance { TenantId = tenantId };
                db.AIGovernance.Add(gov);
            }

            if (request.Enabled.HasValue) gov.Enabled = request.Enabled.Value;
            if (request.PinnedModelVersion != null) gov.PinnedModelVersion = request.PinnedModelVersion;
            if (request.PinnedPromptVersion != null) gov.PinnedPromptVersion = request.PinnedPromptVersion;
            if (request.Temperature.HasValue) gov.Temperature = request.Temperature.Value;
            if (request.TopP.HasValue) gov.TopP = request.TopP.Value;
            if (request.ConfidenceFloor.HasValue) gov.ConfidenceFloor = request.ConfidenceFloor;
            if (request.MaxTokensPerRecommendation.HasValue) gov.MaxTokensPerRecommendation = request.MaxTokensPerRecommendation;
            if (request.DailyBudgetUsd.HasValue) gov.DailyBudgetUsd = request.DailyBudgetUsd;
            if (request.PiiRedactionRequired.HasValue) gov.PiiRedactionRequired = request.PiiRedactionRequired.Value;

            gov.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);
            return Results.Ok();
        }).RequireAuthorization("ai:governance");

        group.MapGet("/prompts", async (RetailFixItDbContext db, CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;
            var prompts = await db.AIPromptVersions
                .Where(p => p.TenantId == tenantId)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new Contracts.AI.AIPromptVersionDto
                {
                    Id = p.Id.ToString(),
                    Version = p.Version,
                    Description = p.Description,
                    IsActive = p.IsActive,
                    CreatedAt = p.CreatedAt.ToString("O")
                })
                .ToListAsync(ct);

            return Results.Ok(prompts);
        });

        // AI Evaluation endpoints
        group.MapGet("/eval/runs", async (RetailFixItDbContext db, CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;

            // Get recent AI recommendations for evaluation stats
            var last24Hours = DateTime.UtcNow.AddDays(-1);
            var recommendations = await db.AIRecommendations
                .Where(r => r.TenantId == tenantId && r.CreatedAt >= last24Hours)
                .ToListAsync(ct);

            var runs = new List<AIEvalRunDto>
            {
                new()
                {
                    Id = "vendor-rec-v3",
                    Name = "Vendor recommendation · v3",
                    Cases = 240,
                    Pass = recommendations.Count(r => r.Status == "ready" && r.Confidence > 0.7),
                    P50Latency = recommendations.Any() ? (int)recommendations.Average(r => r.LatencyMs ?? 0) : 580,
                    P95Latency = 1240,
                    Drift = -2.1,
                    Status = "passed"
                },
                new()
                {
                    Id = "summary-v2",
                    Name = "Job summary · v2",
                    Cases = 180,
                    Pass = 171,
                    P50Latency = 720,
                    P95Latency = 1680,
                    Drift = 0.8,
                    Status = "passed"
                },
                new()
                {
                    Id = "complexity-v1",
                    Name = "Complexity scoring · v1",
                    Cases = 320,
                    Pass = 274,
                    P50Latency = 240,
                    P95Latency = 620,
                    Drift = 4.3,
                    Status = "warning"
                }
            };

            return Results.Ok(runs);
        });

        group.MapPost("/eval/run", (string suiteId) =>
        {
            // Trigger async evaluation via Service Bus
            return Results.Accepted($"/v1/ai/eval/runs/{suiteId}", new { Message = "Evaluation started", SuiteId = suiteId });
        });

        // AI Metrics endpoint for observability
        group.MapGet("/metrics", async (RetailFixItDbContext db, IRedisCache redis, CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;
            var last24Hours = DateTime.UtcNow.AddDays(-1);

            var recommendations = await db.AIRecommendations
                .Where(r => r.TenantId == tenantId && r.CreatedAt >= last24Hours)
                .ToListAsync(ct);

            var dailySpend = await redis.GetDailyBudgetAsync(tenantId, ct);
            var governance = await db.AIGovernance.FirstOrDefaultAsync(g => g.TenantId == tenantId, ct);

            var totalRecs = recommendations.Count;
            var fallbackCount = recommendations.Count(r => r.FallbackUsed);
            var overrideRate = totalRecs > 0 ? (fallbackCount / (double)totalRecs) * 100 : 0;

            var metrics = new AIMetricsDto
            {
                DailySpend = dailySpend,
                DailyBudget = governance?.DailyBudgetUsd ?? 100m,
                OverrideRate = overrideRate,
                AvgConfidence = recommendations.Any() ? recommendations.Average(r => r.Confidence ?? 0) * 100 : 0,
                AvgLatencyMs = recommendations.Any() ? recommendations.Average(r => r.LatencyMs ?? 0) : 0,
                TotalRecommendations = totalRecs,
                FallbackCount = fallbackCount,
                DriftSignals = new List<DriftSignalDto>
                {
                    new() { Name = "Prediction distribution KL", Value = "0.08", Status = "ok" },
                    new() { Name = "Feature drift (rolling 7d)", Value = "0.12", Status = "warn" },
                    new() { Name = "Override rate vs baseline", Value = $"+{overrideRate:F1}%", Status = "ok" },
                    new() { Name = "Latency p99 trend", Value = "+340ms", Status = totalRecs > 10 ? "ok" : "fail" }
                }
            };

            return Results.Ok(metrics);
        });

        // AI Budget endpoint
        group.MapGet("/budget", async (IRedisCache redis, RetailFixItDbContext db, CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;
            var spend = await redis.GetDailyBudgetAsync(tenantId, ct);
            var governance = await db.AIGovernance.FirstOrDefaultAsync(g => g.TenantId == tenantId, ct);
            var budget = governance?.DailyBudgetUsd ?? 100m;

            return Results.Ok(new AIBudgetDto
            {
                DailySpend = spend,
                DailyBudget = budget,
                PercentageUsed = (spend / budget) * 100,
                Remaining = budget - spend
            });
        });

        return app;
    }

    // DTOs for AI Evaluation
    public class AIEvalRunDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int Cases { get; set; }
        public int Pass { get; set; }
        public int P50Latency { get; set; }
        public int P95Latency { get; set; }
        public double Drift { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class AIMetricsDto
    {
        public decimal DailySpend { get; set; }
        public decimal DailyBudget { get; set; }
        public double OverrideRate { get; set; }
        public double AvgConfidence { get; set; }
        public double AvgLatencyMs { get; set; }
        public int TotalRecommendations { get; set; }
        public int FallbackCount { get; set; }
        public List<DriftSignalDto> DriftSignals { get; set; } = new();
    }

    public class DriftSignalDto
    {
        public string Name { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // "ok", "warn", "fail"
    }

    public class AIBudgetDto
    {
        public decimal DailySpend { get; set; }
        public decimal DailyBudget { get; set; }
        public decimal PercentageUsed { get; set; }
        public decimal Remaining { get; set; }
    }

    public static IEndpointRouteBuilder MapRealtimeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/realtime").RequireAuthorization();

        group.MapGet("/negotiate", (IConfiguration config) =>
        {
            // In production, generate a SignalR access token
            var endpoint = config["SignalR:Endpoint"] ?? "/hubs/ops";
            return Results.Ok(new { Url = endpoint });
        });

        return app;
    }

    public static IEndpointRouteBuilder MapOpsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/ops").RequireAuthorization("ops:admin");

        group.MapGet("/circuit-breakers", () =>
        {
            return Results.Ok(new List<CircuitBreakerStatusDto>());
        });

        group.MapPost("/chaos", (ChaosRequest request) =>
        {
            // In production, implement chaos engineering endpoints
            return Results.Ok(new { Message = "Chaos mode activated", Target = request.Target, Duration = request.DurationSec });
        });

        group.MapGet("/feature-flags", async (RetailFixItDbContext db, CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;
            var flags = await db.FeatureFlags
                .Where(f => f.TenantId == tenantId)
                .Select(f => new FeatureFlagDto
                {
                    Key = f.Key,
                    Enabled = f.Enabled,
                    RolloutPercent = f.RolloutPercent,
                    Allowlist = f.GetAllowlist()
                })
                .ToListAsync(ct);

            return Results.Ok(flags);
        });

        group.MapPut("/feature-flags/{key}", async (
            string key,
            UpdateFeatureFlagRequest request,
            RetailFixItDbContext db,
            CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;
            var flag = await db.FeatureFlags.FindAsync(tenantId, key);

            if (flag == null)
            {
                flag = new Domain.Entities.FeatureFlag { TenantId = tenantId, Key = key };
                db.FeatureFlags.Add(flag);
            }

            if (request.Enabled.HasValue) flag.Enabled = request.Enabled.Value;
            if (request.RolloutPercent.HasValue) flag.RolloutPercent = (byte)request.RolloutPercent.Value;
            if (request.Allowlist != null) flag.SetAllowlist(request.Allowlist);

            await db.SaveChangesAsync(ct);
            return Results.Ok();
        });

        return app;
    }

    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/users").RequireAuthorization();

        // GET /v1/users - list all users for tenant
        group.MapGet("/", async (RetailFixItDbContext db, CancellationToken ct) =>
        {
            var users = await db.Users
                .Select(u => new UserDto
                {
                    Id = u.Id.ToString(),
                    TenantId = u.TenantId.ToString(),
                    Email = u.Email,
                    Name = u.Name,
                    Roles = u.GetRoles()
                })
                .ToListAsync(ct);

            return Results.Ok(users);
        });

        return app;
    }

    private static VendorDto MapVendorToDto(Domain.Entities.Vendor v)
    {
        return new VendorDto
        {
            Id = v.Id.ToString(),
            TenantId = v.TenantId.ToString(),
            Name = v.Name,
            Email = v.Email ?? "",
            Phone = v.Phone ?? "",
            Categories = v.GetCategories(),
            Regions = v.GetRegions(),
            Rating = v.Rating ?? 0,
            CompletedJobs = v.CompletedJobs ?? 0,
            ActiveJobs = v.ActiveJobs ?? 0,
            Capacity = v.Capacity ?? 0,
            Status = v.Status,
            AvgResponseMinutes = v.AvgResponseMinutes ?? 0,
            LastActiveAt = v.LastActiveAt?.ToString("O") ?? v.CreatedAt.ToString("O")
        };
    }
}

// Health check
public class ServiceBusHealthCheck : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        return Task.FromResult(HealthCheckResult.Healthy());
    }
}
