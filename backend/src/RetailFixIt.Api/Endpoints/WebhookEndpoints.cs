using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RetailFixIt.Contracts.Jobs;
using RetailFixIt.Domain.Entities;
using RetailFixIt.Domain.Enums;
using RetailFixIt.Infrastructure.Cosmos;
using RetailFixIt.Infrastructure.Data;
using RetailFixIt.Infrastructure.ServiceBus;
using RetailFixIt.Infrastructure.SignalR;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace RetailFixIt.Api.Endpoints;

public static class WebhookEndpoints
{
    public static IEndpointRouteBuilder MapWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        // POST /webhooks/intake/{tenantSlug} - External job intake
        app.MapPost("/webhooks/intake/{tenantSlug}", async (
            string tenantSlug,
            [FromBody] JsonElement body,
            [FromHeader(Name = "X-Webhook-Signature")] string? signature,
            [FromHeader(Name = "X-Source-Id")] string? sourceId,
            RetailFixItDbContext db,
            IEventPublisher publisher,
            IRealtimeNotifier notifier,
            CosmosDbContext cosmos,
            IConfiguration config,
            CancellationToken ct) =>
        {
            // Find tenant by slug
            var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == tenantSlug, ct);
            if (tenant == null)
            {
                return Results.Problem("Unknown tenant", statusCode: 404);
            }

            // Verify HMAC if configured
            var secret = config[$"Webhooks:Secrets:{sourceId}"];
            if (!string.IsNullOrEmpty(secret))
            {
                if (string.IsNullOrEmpty(signature) || !VerifyHmac(body, signature, secret))
                {
                    return Results.Problem("Invalid signature", statusCode: 401);
                }
            }

            TenantContext.Current = tenant.Id;
            var correlationId = Guid.NewGuid().ToString("N")[..16];

            try
            {
                // Parse webhook payload
                var title = body.GetProperty("title").GetString() ?? "Untitled Job";
                var description = body.TryGetProperty("description", out var desc) ? desc.GetString() : null;
                var customerName = body.TryGetProperty("customer", out var cust) ? cust.GetString() : null;
                var customerPhone = body.TryGetProperty("phone", out var phone) ? phone.GetString() : null;
                var address = body.TryGetProperty("address", out var addr) ? addr.GetString() : null;
                var city = body.TryGetProperty("city", out var c) ? c.GetString() : null;
                var region = body.TryGetProperty("region", out var r) ? r.GetString() : null;
                var category = body.TryGetProperty("category", out var cat) ? cat.GetString() : "HVAC";
                var priority = body.TryGetProperty("priority", out var prio) ? prio.GetString() : "normal";
                var externalId = body.TryGetProperty("externalId", out var ext) ? ext.GetString() : null;

                var jobCount = await db.Jobs.CountAsync(ct);
                var job = new Job
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    Reference = $"JOB-{1042 + jobCount}",
                    Title = title,
                    Description = description,
                    CustomerName = customerName,
                    CustomerPhone = customerPhone,
                    Address = address,
                    City = city,
                    Region = region,
                    Category = category ?? "HVAC",
                    Status = JobStatuses.New,
                    Priority = priority ?? JobPriorities.Normal,
                    SlaDueAt = DateTime.UtcNow.AddHours(24),
                    EstimatedValue = 500,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                db.Jobs.Add(job);
                await db.SaveChangesAsync(ct);

                // Append audit
                await cosmos.AppendAuditAsync(new AuditLogDocument
                {
                    Id = $"log_{Guid.NewGuid():N}",
                    TenantId = tenant.Id,
                    Actor = sourceId ?? "webhook",
                    ActorRole = "system",
                    Action = "job.created",
                    EntityType = "job",
                    EntityId = job.Id.ToString(),
                    Metadata = new Dictionary<string, JsonElement>
                    {
                        ["reference"] = JsonSerializer.SerializeToElement(job.Reference),
                        ["channel"] = JsonSerializer.SerializeToElement("webhook"),
                        ["sourceId"] = JsonSerializer.SerializeToElement(sourceId ?? "unknown"),
                        ["externalId"] = JsonSerializer.SerializeToElement(externalId ?? "unknown")
                    },
                    CorrelationId = correlationId,
                    TraceId = correlationId,
                    CreatedAt = DateTime.UtcNow
                }, ct);

                // Publish event
                await publisher.PublishAsync("job.created", new { job.Id, job.Reference }, tenant.Id, correlationId, correlationId, ct);

                // Notify via SignalR
                await notifier.SendToTenantAsync(tenant.Id, "job.created", new
                {
                    Id = job.Id.ToString(),
                    Reference = job.Reference,
                    Title = job.Title,
                    Status = job.Status,
                    CreatedAt = job.CreatedAt.ToString("O")
                }, ct);

                return Results.Created($"/v1/jobs/{job.Id}", new
                {
                    Id = job.Id,
                    Reference = job.Reference,
                    Message = "Job created successfully via webhook"
                });
            }
            finally
            {
                TenantContext.Clear();
            }
        });

        // POST /webhooks/vendor/{vendorId} - Vendor mobile app updates
        app.MapPost("/webhooks/vendor/{vendorId:guid}", async (
            Guid vendorId,
            [FromBody] VendorUpdateRequest request,
            [FromHeader(Name = "X-Webhook-Signature")] string? signature,
            [FromHeader(Name = "X-Source-Id")] string? sourceId,
            RetailFixItDbContext db,
            IEventPublisher publisher,
            IRealtimeNotifier notifier,
            CosmosDbContext cosmos,
            IConfiguration config,
            CancellationToken ct) =>
        {
            var vendor = await db.Vendors.FindAsync(new object[] { vendorId }, ct);
            if (vendor == null)
            {
                return Results.NotFound("Vendor not found");
            }

            // Verify HMAC
            var secret = config[$"Webhooks:Secrets:vendor-{vendorId}"];
            if (!string.IsNullOrEmpty(secret))
            {
                var payload = JsonSerializer.Serialize(request);
                if (string.IsNullOrEmpty(signature) || !VerifyHmacString(payload, signature, secret))
                {
                    return Results.Problem("Invalid signature", statusCode: 401);
                }
            }

            TenantContext.Current = vendor.TenantId;
            var correlationId = Guid.NewGuid().ToString("N")[..16];

            try
            {
                // Update vendor status/location
                if (request.Status != null) vendor.Status = request.Status;
                if (request.Latitude.HasValue && request.Longitude.HasValue)
                {
                    vendor.LastActiveAt = DateTime.UtcNow;
                }

                await db.SaveChangesAsync(ct);

                // If assignment update included
                if (request.AssignmentId.HasValue && request.AssignmentAction != null)
                {
                    var assignment = await db.Assignments.FindAsync(request.AssignmentId.Value);
                    if (assignment != null && assignment.VendorId == vendorId)
                    {
                        switch (request.AssignmentAction.ToLower())
                        {
                            case "accept":
                                assignment.Status = AssignmentStatuses.Accepted;
                                assignment.AcceptedAt = DateTime.UtcNow;
                                await notifier.SendToTenantAsync(vendor.TenantId, "assignment.accepted", new
                                {
                                    AssignmentId = assignment.Id,
                                    JobId = assignment.JobId,
                                    VendorId = vendorId
                                }, ct);
                                break;
                            case "decline":
                                assignment.Status = AssignmentStatuses.Declined;
                                assignment.Notes = request.DeclineReason;
                                await notifier.SendToTenantAsync(vendor.TenantId, "assignment.declined", new
                                {
                                    AssignmentId = assignment.Id,
                                    JobId = assignment.JobId,
                                    VendorId = vendorId,
                                    Reason = request.DeclineReason
                                }, ct);
                                break;
                            case "complete":
                                assignment.Status = AssignmentStatuses.Completed;
                                assignment.CompletedAt = DateTime.UtcNow;
                                var job = await db.Jobs.FindAsync(assignment.JobId);
                                if (job != null)
                                {
                                    job.Status = JobStatuses.Completed;
                                    job.UpdatedAt = DateTime.UtcNow;
                                }
                                await notifier.SendToTenantAsync(vendor.TenantId, "assignment.completed", new
                                {
                                    AssignmentId = assignment.Id,
                                    JobId = assignment.JobId,
                                    VendorId = vendorId
                                }, ct);
                                break;
                        }
                        await db.SaveChangesAsync(ct);
                    }
                }

                // Append audit
                await cosmos.AppendAuditAsync(new AuditLogDocument
                {
                    Id = $"log_{Guid.NewGuid():N}",
                    TenantId = vendor.TenantId,
                    Actor = vendorId.ToString(),
                    ActorRole = "vendor",
                    Action = "vendor.webhook_update",
                    EntityType = "vendor",
                    EntityId = vendorId.ToString(),
                    Metadata = new Dictionary<string, JsonElement>
                    {
                        ["channel"] = JsonSerializer.SerializeToElement("vendor_webhook")
                    },
                    CorrelationId = correlationId,
                    TraceId = correlationId,
                    CreatedAt = DateTime.UtcNow
                }, ct);

                return Results.Ok(new { Message = "Vendor update received" });
            }
            finally
            {
                TenantContext.Clear();
            }
        });

        return app;
    }

    private static bool VerifyHmac(JsonElement body, string signature, string secret)
    {
        var payload = body.ToString();
        return VerifyHmacString(payload, signature, secret);
    }

    private static bool VerifyHmacString(string payload, string signature, string secret)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(payloadBytes);
        var computedSignature = Convert.ToBase64String(hash);

        // Support both base64 and hex signatures
        if (signature.Contains(':'))
        {
            // Format: "sha256=<hex>"
            var parts = signature.Split('=', 2);
            if (parts.Length == 2)
            {
                var hexHash = BitConverter.ToString(hash).Replace("-", "").ToLower();
                return hexHash == parts[1].ToLower();
            }
        }

        return computedSignature == signature;
    }
}

public class VendorUpdateRequest
{
    public string? Status { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public Guid? AssignmentId { get; set; }
    public string? AssignmentAction { get; set; } // "accept", "decline", "complete"
    public string? DeclineReason { get; set; }
}
