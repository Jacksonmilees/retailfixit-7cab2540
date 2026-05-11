using Microsoft.EntityFrameworkCore;
using RetailFixIt.Contracts.Dashboard;
using RetailFixIt.Domain.Enums;
using RetailFixIt.Infrastructure.Data;
using RetailFixIt.Infrastructure.Redis;

namespace RetailFixIt.Api.Endpoints;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/dashboard").RequireAuthorization();

        // GET /v1/dashboard/metrics
        group.MapGet("/metrics", async (
            RetailFixItDbContext db,
            IRedisCache redis,
            CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;
            var cacheKey = $"dashboard:{tenantId}";

            // Try cache first
            var cached = await redis.GetAsync<DashboardMetricsDto>(cacheKey, ct);
            if (cached != null)
            {
                return Results.Ok(cached);
            }

            var today = DateTime.UtcNow.Date;

            // Calculate metrics
            var jobs = await db.Jobs.ToListAsync(ct);
            var vendors = await db.Vendors.Where(v => v.Status == VendorStatuses.Active).ToListAsync(ct);
            var assignments = await db.Assignments.ToListAsync(ct);
            var recs = await db.AIRecommendations.ToListAsync(ct);

            var openJobs = jobs.Count(j => j.Status != JobStatuses.Completed && j.Status != JobStatuses.Cancelled);
            var assignedToday = jobs.Count(j => j.AssignedAt.HasValue && j.AssignedAt.Value.Date == today);
            var completedToday = jobs.Count(j => j.Status == JobStatuses.Completed);
            var slaBreaches = jobs.Count(j => j.SlaDueAt.HasValue && j.SlaDueAt.Value < DateTime.UtcNow &&
                j.Status != JobStatuses.Completed && j.Status != JobStatuses.Cancelled);

            var byStatus = jobs.GroupBy(j => j.Status)
                .Select(g => new StatusCountDto { Status = g.Key ?? "unknown", Count = g.Count() })
                .ToList();

            var byPriority = jobs.GroupBy(j => j.Priority)
                .Select(g => new PriorityCountDto { Priority = g.Key ?? "unknown", Count = g.Count() })
                .ToList();

            // Generate trend for last 14 days
            var trend = Enumerable.Range(0, 14)
                .Select(i =>
                {
                    var date = today.AddDays(-13 + i);
                    return new JobsTrendDto
                    {
                        Date = date.ToString("yyyy-MM-dd"),
                        Created = jobs.Count(j => j.CreatedAt.Date == date),
                        Completed = jobs.Count(j => j.Status == JobStatuses.Completed &&
                            assignments.Any(a => a.JobId == j.Id && a.CompletedAt.HasValue && a.CompletedAt.Value.Date == date))
                    };
                }).ToList();

            var aiOverrides = recs.Count(r => !string.IsNullOrEmpty(r.OverrideReason));
            var aiOverrideRate = recs.Any() ? (decimal)aiOverrides / recs.Count : 0;

            var metrics = new DashboardMetricsDto
            {
                JobsOpen = openJobs,
                JobsAssignedToday = assignedToday,
                JobsCompletedToday = completedToday,
                SlaBreaches = slaBreaches,
                AvgAssignmentMinutes = 23, // Would calculate from real data
                AiOverrideRate = aiOverrideRate,
                VendorsActive = vendors.Count,
                JobsByStatus = byStatus,
                JobsByPriority = byPriority,
                JobsTrend = trend
            };

            // Cache for 30 seconds
            await redis.SetAsync(cacheKey, metrics, TimeSpan.FromSeconds(30), ct);

            return Results.Ok(metrics);
        });

        return app;
    }
}
