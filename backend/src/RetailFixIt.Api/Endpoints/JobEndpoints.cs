using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RetailFixIt.Contracts.AI;
using RetailFixIt.Contracts.Audit;
using RetailFixIt.Contracts.Common;
using RetailFixIt.Contracts.Jobs;
using RetailFixIt.Domain.Entities;
using RetailFixIt.Domain.Enums;
using RetailFixIt.Infrastructure.Cosmos;
using RetailFixIt.Infrastructure.Data;
using RetailFixIt.Infrastructure.Redis;
using RetailFixIt.Infrastructure.ServiceBus;
using RetailFixIt.Infrastructure.SignalR;
using System.Security.Claims;

namespace RetailFixIt.Api.Endpoints;

public static class JobEndpoints
{
    public static IEndpointRouteBuilder MapJobEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/jobs")
            .RequireAuthorization();

        // GET /v1/jobs
        group.MapGet("/", async (
            [AsParameters] JobListQuery query,
            RetailFixItDbContext db,
            CancellationToken ct) =>
        {
            var jobsQuery = db.Jobs.AsQueryable();

            if (query.Status?.Count > 0)
                jobsQuery = jobsQuery.Where(j => query.Status.Contains(j.Status));

            if (query.Priority?.Count > 0)
                jobsQuery = jobsQuery.Where(j => query.Priority.Contains(j.Priority));

            if (query.Category?.Count > 0)
                jobsQuery = jobsQuery.Where(j => query.Category.Contains(j.Category));

            if (query.Region?.Count > 0)
                jobsQuery = jobsQuery.Where(j => query.Region.Contains(j.Region));

            if (!string.IsNullOrEmpty(query.Search))
            {
                var search = query.Search.ToLower();
                jobsQuery = jobsQuery.Where(j =>
                    EF.Functions.Like(j.Reference.ToLower(), $"%{search}%") ||
                    EF.Functions.Like(j.Title.ToLower(), $"%{search}%") ||
                    EF.Functions.Like(j.CustomerName!.ToLower(), $"%{search}%") ||
                    EF.Functions.Like(j.City!.ToLower(), $"%{search}%"));
            }

            var total = await jobsQuery.CountAsync(ct);
            var items = await jobsQuery
                .OrderByDescending(j => j.CreatedAt)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(j => MapToDto(j))
                .ToListAsync(ct);

            return Results.Ok(new Page<JobDto>
            {
                Items = items,
                Total = total,
                Page = query.Page,
                PageSize = query.PageSize
            });
        });

        // GET /v1/jobs/{id}
        group.MapGet("/{id:guid}", async (
            Guid id,
            RetailFixItDbContext db,
            CancellationToken ct) =>
        {
            var job = await db.Jobs.FindAsync(new object[] { id }, ct);
            if (job == null) return Results.NotFound();
            return Results.Ok(MapToDto(job));
        });

        // POST /v1/jobs
        group.MapPost("/", async (
            CreateJobRequest request,
            RetailFixItDbContext db,
            IEventPublisher publisher,
            IRealtimeNotifier notifier,
            CosmosDbContext cosmos,
            CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;
            var userId = GetCurrentUserId();
            var correlationId = Guid.NewGuid().ToString("N")[..16];

            var jobCount = await db.Jobs.CountAsync(ct);
            var job = new Job
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Reference = $"JOB-{1042 + jobCount}",
                Title = request.Title,
                Description = request.Description,
                CustomerName = request.CustomerName,
                CustomerPhone = request.CustomerPhone,
                Address = request.Address,
                City = request.City,
                Region = request.Region,
                Category = request.Category ?? "HVAC",
                Status = JobStatuses.New,
                Priority = request.Priority ?? JobPriorities.Normal,
                SlaDueAt = request.SlaDueAt ?? DateTime.UtcNow.AddHours(24),
                EstimatedValue = request.EstimatedValue ?? 500,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            db.Jobs.Add(job);

            // Add outbox message
            var outbox = new OutboxMessage
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Type = "job.created",
                PayloadJson = System.Text.Json.JsonSerializer.Serialize(new { job.Id, job.Reference }),
                CorrelationId = correlationId
            };
            db.OutboxMessages.Add(outbox);

            await db.SaveChangesAsync(ct);

            // Append audit
            await cosmos.AppendAuditAsync(new AuditLogDocument
            {
                Id = $"log_{Guid.NewGuid():N}",
                TenantId = tenantId,
                Actor = userId,
                ActorRole = "dispatcher",
                Action = "job.created",
                EntityType = "job",
                EntityId = job.Id.ToString(),
                Metadata = new Dictionary<string, System.Text.Json.JsonElement>
                {
                    ["reference"] = System.Text.Json.JsonSerializer.SerializeToElement(job.Reference),
                    ["channel"] = System.Text.Json.JsonSerializer.SerializeToElement("api")
                },
                CorrelationId = correlationId,
                TraceId = correlationId,
                CreatedAt = DateTime.UtcNow
            }, ct);

            // Publish event
            await publisher.PublishAsync("job.created", new { job.Id, job.Reference }, tenantId, correlationId, correlationId, ct);

            // Notify via SignalR
            await notifier.SendToTenantAsync(tenantId, "job.created", MapToDto(job), ct);

            return Results.Created($"/v1/jobs/{job.Id}", MapToDto(job));
        }).RequireAuthorization("jobs:create");

        // PATCH /v1/jobs/{id}
        group.MapPatch("/{id:guid}", async (
            Guid id,
            UpdateJobRequest request,
            RetailFixItDbContext db,
            IEventPublisher publisher,
            IRealtimeNotifier notifier,
            CancellationToken ct) =>
        {
            var job = await db.Jobs.FindAsync(new object[] { id }, ct);
            if (job == null) return Results.NotFound();

            var tenantId = TenantContext.Current!.Value;

            // Apply updates
            if (request.Title != null) job.Title = request.Title;
            if (request.Description != null) job.Description = request.Description;
            if (request.Status != null) job.Status = request.Status;
            if (request.Priority != null) job.Priority = request.Priority;
            if (request.CustomerName != null) job.CustomerName = request.CustomerName;
            if (request.CustomerPhone != null) job.CustomerPhone = request.CustomerPhone;
            if (request.Address != null) job.Address = request.Address;
            if (request.City != null) job.City = request.City;
            if (request.Region != null) job.Region = request.Region;
            if (request.Category != null) job.Category = request.Category;
            if (request.SlaDueAt != null) job.SlaDueAt = DateTime.Parse(request.SlaDueAt);
            if (request.EstimatedValue != null) job.EstimatedValue = request.EstimatedValue;
            if (request.ComplexityScore != null) job.ComplexityScore = (byte)request.ComplexityScore;
            if (request.EscalationRisk != null) job.EscalationRisk = request.EscalationRisk;
            if (request.AiSummary != null) job.AiSummary = request.AiSummary;

            job.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);

            await notifier.SendToTenantAsync(tenantId, "job.updated", MapToDto(job), ct);

            return Results.Ok(MapToDto(job));
        });

        // POST /v1/jobs/{id}/assign
        group.MapPost("/{id:guid}/assign", async (
            Guid id,
            AssignJobRequest request,
            RetailFixItDbContext db,
            IEventPublisher publisher,
            IRealtimeNotifier notifier,
            CancellationToken ct) =>
        {
            var job = await db.Jobs.FindAsync(new object[] { id }, ct);
            if (job == null) return Results.NotFound();

            var vendor = await db.Vendors.FindAsync(new object[] { Guid.Parse(request.VendorId) }, ct);
            if (vendor == null) return Results.NotFound("Vendor not found");

            var tenantId = TenantContext.Current!.Value;
            var userId = GetCurrentUserId();
            var assignedBy = request.Source == "ai" ? "ai" : userId;

            var assignment = new Assignment
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                JobId = job.Id,
                VendorId = vendor.Id,
                AssignedBy = assignedBy,
                AssignedAt = DateTime.UtcNow,
                Status = AssignmentStatuses.Pending,
                Notes = request.Reason
            };

            job.AssignedVendorId = vendor.Id;
            job.AssignedAt = DateTime.UtcNow;
            job.Status = JobStatuses.Assigned;
            job.UpdatedAt = DateTime.UtcNow;

            db.Assignments.Add(assignment);
            await db.SaveChangesAsync(ct);

            await notifier.SendToTenantAsync(tenantId, "job.assigned", new
            {
                JobId = job.Id,
                VendorId = vendor.Id,
                AssignmentId = assignment.Id,
                Source = request.Source ?? "human"
            }, ct);

            return Results.Ok(new AssignmentDto
            {
                Id = assignment.Id.ToString(),
                JobId = assignment.JobId.ToString(),
                VendorId = assignment.VendorId.ToString(),
                AssignedBy = assignment.AssignedBy,
                AssignedAt = assignment.AssignedAt.ToString("O"),
                Status = assignment.Status
            });
        }).RequireAuthorization("jobs:assign");

        // POST /v1/jobs/{id}/recommendation
        group.MapPost("/{id:guid}/recommendation", async (
            Guid id,
            RetailFixItDbContext db,
            IEventPublisher publisher,
            IOpenAIClient openAI,
            IRedisCache redis,
            CancellationToken ct) =>
        {
            var job = await db.Jobs.FindAsync(new object[] { id }, ct);
            if (job == null) return Results.NotFound();

            var tenantId = TenantContext.Current!.Value;
            var correlationId = Guid.NewGuid().ToString("N")[..16];

            // Check daily budget
            var dailySpend = await redis.GetDailyBudgetAsync(tenantId, ct);
            var governance = await db.AIGovernance.FirstOrDefaultAsync(g => g.TenantId == tenantId, ct);
            if (dailySpend > (governance?.DailyBudgetUsd ?? 100m) * 0.9m)
            {
                return Results.Problem("Daily AI budget exceeded", statusCode: 429);
            }

            // Create recommendation record
            var rec = new AIRecommendation
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                JobId = job.Id,
                Status = AIRecommendationStatuses.Pending,
                CreatedAt = DateTime.UtcNow
            };

            db.AIRecommendations.Add(rec);
            await db.SaveChangesAsync(ct);

            // Queue for async processing (would typically go to Service Bus)
            // For now, we'll just return 202 Accepted

            return Results.Accepted($"/v1/jobs/{id}/recommendation", new { RecommendationId = rec.Id });
        });

        // GET /v1/jobs/{id}/recommendation
        group.MapGet("/{id:guid}/recommendation", async (
            Guid id,
            RetailFixItDbContext db,
            CancellationToken ct) =>
        {
            var rec = await db.AIRecommendations
                .Where(r => r.JobId == id)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync(ct);

            if (rec == null) return Results.NotFound();

            return Results.Ok(new AIRecommendationDto
            {
                Id = rec.Id.ToString(),
                JobId = rec.JobId.ToString(),
                CreatedAt = rec.CreatedAt.ToString("O"),
                ModelVersion = rec.ModelVersion ?? "gpt-4o-mini",
                LatencyMs = rec.LatencyMs ?? 0,
                Candidates = rec.GetCandidates().Select(c => new AICandidateDto
                {
                    VendorId = c.VendorId,
                    Score = c.Score,
                    Reasoning = c.Reasoning
                }).ToList(),
                Confidence = rec.Confidence ?? 0,
                FallbackUsed = rec.FallbackUsed,
                Status = rec.Status ?? "pending",
                AcceptedVendorId = rec.AcceptedVendorId?.ToString(),
                OverrideReason = rec.OverrideReason
            });
        });

        // POST /v1/jobs/{id}/summary
        group.MapPost("/{id:guid}/summary", async (
            Guid id,
            JobSummaryRequest request,
            RetailFixItDbContext db,
            IOpenAIClient openAI,
            CancellationToken ct) =>
        {
            var job = await db.Jobs.FindAsync(new object[] { id }, ct);
            if (job == null) return Results.NotFound();

            var systemPrompt = "You are a helpful assistant. Summarize the following job description briefly.";
            var summary = await openAI.GenerateJobSummaryAsync("gpt-4o-mini", systemPrompt, request.Raw, ct);

            job.AiSummary = summary;
            await db.SaveChangesAsync(ct);

            return Results.Ok(new JobSummaryResponse { Summary = summary });
        });

        // POST /v1/jobs/{id}/cancel
        group.MapPost("/{id:guid}/cancel", async (
            Guid id,
            CancelJobRequest request,
            RetailFixItDbContext db,
            IRealtimeNotifier notifier,
            CancellationToken ct) =>
        {
            var job = await db.Jobs.FindAsync(new object[] { id }, ct);
            if (job == null) return Results.NotFound();

            var tenantId = TenantContext.Current!.Value;

            job.Status = JobStatuses.Cancelled;
            job.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync(ct);

            await notifier.SendToTenantAsync(tenantId, "job.updated", MapToDto(job), ct);

            return Results.Ok(MapToDto(job));
        });

        // GET /v1/jobs/{id}/timeline
        group.MapGet("/{id:guid}/timeline", async (
            Guid id,
            [AsParameters] TimelineQuery query,
            RetailFixItDbContext db,
            CosmosDbContext cosmos,
            CancellationToken ct) =>
        {
            var job = await db.Jobs.FindAsync(new object[] { id }, ct);
            if (job == null) return Results.NotFound();

            var tenantId = TenantContext.Current!.Value;

            // Query audit logs for this job
            var (items, _) = await cosmos.QueryAuditAsync(
                tenantId,
                entityType: "job",
                entityId: id.ToString(),
                correlationId: query.CorrelationId,
                pageSize: query.PageSize,
                ct: ct);

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

        return app;
    }

    private static JobDto MapToDto(Job job)
    {
        return new JobDto
        {
            Id = job.Id.ToString(),
            TenantId = job.TenantId.ToString(),
            Reference = job.Reference,
            Title = job.Title,
            Description = job.Description ?? "",
            CustomerName = job.CustomerName ?? "",
            CustomerPhone = job.CustomerPhone,
            Address = job.Address ?? "",
            City = job.City ?? "",
            Region = job.Region ?? "",
            Category = job.Category ?? "",
            Status = job.Status ?? JobStatuses.New,
            Priority = job.Priority ?? JobPriorities.Normal,
            SlaDueAt = job.SlaDueAt?.ToString("O") ?? "",
            CreatedAt = job.CreatedAt.ToString("O"),
            UpdatedAt = job.UpdatedAt?.ToString("O") ?? job.CreatedAt.ToString("O"),
            AssignedVendorId = job.AssignedVendorId?.ToString(),
            AssignedAt = job.AssignedAt?.ToString("O"),
            EstimatedValue = job.EstimatedValue ?? 0,
            ComplexityScore = job.ComplexityScore,
            EscalationRisk = job.EscalationRisk,
            AiSummary = job.AiSummary
        };
    }

    private static string GetCurrentUserId()
    {
        // In real implementation, get from ClaimsPrincipal
        return "system";
    }
}
