using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RetailFixIt.Domain.Entities;
using RetailFixIt.Domain.Enums;
using RetailFixIt.Infrastructure.Cosmos;
using RetailFixIt.Infrastructure.Data;
using RetailFixIt.Infrastructure.OpenAI;
using RetailFixIt.Infrastructure.Redis;
using RetailFixIt.Infrastructure.ServiceBus;
using RetailFixIt.Infrastructure.SignalR;
using System.Text.Json;

namespace RetailFixIt.Workers.Functions;

public class AIRecommendationFunction
{
    private readonly ILogger<AIRecommendationFunction> _logger;
    private readonly RetailFixItDbContext _dbContext;
    private readonly IOpenAIClient _openAI;
    private readonly IRedisCache _redis;
    private readonly IEventPublisher _publisher;
    private readonly CosmosDbContext _cosmos;

    public AIRecommendationFunction(
        ILogger<AIRecommendationFunction> logger,
        RetailFixItDbContext dbContext,
        IOpenAIClient openAI,
        IRedisCache redis,
        IEventPublisher publisher,
        CosmosDbContext cosmos)
    {
        _logger = logger;
        _dbContext = dbContext;
        _openAI = openAI;
        _redis = redis;
        _publisher = publisher;
        _cosmos = cosmos;
    }

    [Function("AIRecommendationProcessor")]
    public async Task Run(
        [ServiceBusTrigger("ai-recommendations", "processor", Connection = "ServiceBusConnection")] string message,
        FunctionContext context)
    {
        var request = JsonSerializer.Deserialize<AIRequest>(message);
        if (request == null)
        {
            _logger.LogError("Failed to deserialize AI recommendation request");
            return;
        }

        // Set tenant context for RLS
        TenantContext.Current = request.TenantId;

        try
        {
            var recommendation = await _dbContext.AIRecommendations.FindAsync(request.RecommendationId);
            if (recommendation == null)
            {
                _logger.LogWarning("Recommendation {Id} not found", request.RecommendationId);
                return;
            }

            var job = await _dbContext.Jobs.FindAsync(recommendation.JobId);
            if (job == null)
            {
                _logger.LogWarning("Job {JobId} not found for recommendation", recommendation.JobId);
                return;
            }

            var governance = await _dbContext.AIGovernance.FirstOrDefaultAsync(g => g.TenantId == request.TenantId);
            var promptVersion = await _dbContext.AIPromptVersions
                .FirstOrDefaultAsync(p => p.TenantId == request.TenantId && p.IsActive);

            // Check daily budget
            var dailySpend = await _redis.GetDailyBudgetAsync(request.TenantId);
            if (dailySpend > (governance?.DailyBudgetUsd ?? 100m))
            {
                _logger.LogWarning("Daily AI budget exceeded for tenant {TenantId}", request.TenantId);
                recommendation.Status = AIRecommendationStatuses.Failed;
                await _dbContext.SaveChangesAsync();
                return;
            }

            // Get candidate vendors
            var candidates = await GetVendorCandidates(request.TenantId, job, 5);

            var modelVersion = governance?.PinnedModelVersion ?? "gpt-4o-mini";
            var systemPrompt = promptVersion?.SystemPrompt ?? GetDefaultSystemPrompt();

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var result = await _openAI.GetVendorRecommendationAsync(
                modelVersion,
                systemPrompt,
                $"{job.Title}. {job.Description}",
                candidates,
                governance?.Temperature ?? 0.2,
                governance?.TopP ?? 0.9,
                governance?.MaxTokensPerRecommendation ?? 600);
            stopwatch.Stop();

            // Update recommendation
            recommendation.ModelVersion = modelVersion;
            recommendation.PromptVersion = promptVersion?.Version;
            recommendation.LatencyMs = (int)stopwatch.ElapsedMilliseconds;
            recommendation.Status = AIRecommendationStatuses.Ready;
            recommendation.FallbackUsed = result.FallbackToHuman;
            recommendation.Confidence = result.Candidates.FirstOrDefault()?.Score ?? 0;
            recommendation.PromptTokens = result.PromptTokens;
            recommendation.CompletionTokens = result.CompletionTokens;
            recommendation.SetCandidates(result.Candidates.Select(c => new AICandidate
            {
                VendorId = c.VendorId,
                Score = c.Score,
                Reasoning = c.Reasoning
            }).ToList());

            // Track cost
            var costUsd = EstimateCost(result.PromptTokens, result.CompletionTokens, modelVersion);
            recommendation.CostUsd = costUsd;
            await _redis.IncrementDailyBudgetAsync(request.TenantId, costUsd);

            await _dbContext.SaveChangesAsync();

            // Publish event
            await _publisher.PublishAsync(
                "ai.recommendation.ready",
                new
                {
                    recommendation.Id,
                    recommendation.JobId,
                    recommendation.FallbackUsed,
                    Candidates = result.Candidates
                },
                request.TenantId,
                request.CorrelationId,
                request.TraceId);

            // Append audit
            await _cosmos.AppendAuditAsync(new AuditLogDocument
            {
                Id = $"log_{Guid.NewGuid():N}",
                TenantId = request.TenantId,
                Actor = "ai",
                ActorRole = "system",
                Action = "ai.recommendation.completed",
                EntityType = "ai_recommendation",
                EntityId = recommendation.Id.ToString(),
                Metadata = new Dictionary<string, JsonElement>
                {
                    ["latencyMs"] = JsonSerializer.SerializeToElement(recommendation.LatencyMs),
                    ["confidence"] = JsonSerializer.SerializeToElement(recommendation.Confidence),
                    ["fallbackUsed"] = JsonSerializer.SerializeToElement(recommendation.FallbackUsed)
                },
                CorrelationId = request.CorrelationId,
                TraceId = request.TraceId,
                CreatedAt = DateTime.UtcNow
            });

            _logger.LogInformation(
                "AI recommendation {Id} completed for job {JobId} in {LatencyMs}ms",
                recommendation.Id, recommendation.JobId, recommendation.LatencyMs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process AI recommendation {Id}", request.RecommendationId);

            // Mark as failed
            var rec = await _dbContext.AIRecommendations.FindAsync(request.RecommendationId);
            if (rec != null)
            {
                rec.Status = AIRecommendationStatuses.Failed;
                await _dbContext.SaveChangesAsync();
            }

            throw; // Let Functions retry
        }
        finally
        {
            TenantContext.Clear();
        }
    }

    private async Task<List<VendorCandidate>> GetVendorCandidates(Guid tenantId, Job job, int count)
    {
        var vendors = await _dbContext.Vendors
            .Where(v => v.TenantId == tenantId && v.Status == VendorStatuses.Active)
            .ToListAsync();

        // Filter by category match
        var categoryVendors = vendors
            .Where(v => v.GetCategories().Contains(job.Category))
            .ToList();

        // Sort by composite score (rating, capacity, response time)
        return categoryVendors
            .Select(v => new VendorCandidate
            {
                Id = v.Id.ToString(),
                Name = v.Name,
                Categories = v.GetCategories(),
                Rating = v.Rating ?? 0,
                ActiveJobs = v.ActiveJobs ?? 0,
                Capacity = v.Capacity ?? 10
            })
            .OrderByDescending(v => CalculateFitScore(v, job))
            .Take(count)
            .ToList();
    }

    private static double CalculateFitScore(VendorCandidate vendor, Job job)
    {
        var capacityScore = 1.0 - ((double)vendor.ActiveJobs / vendor.Capacity);
        var ratingScore = vendor.Rating / 5.0;
        var categoryMatch = vendor.Categories.Contains(job.Category) ? 1.0 : 0.5;

        return (capacityScore * 0.4) + (ratingScore * 0.4) + (categoryMatch * 0.2);
    }

    private static decimal EstimateCost(int promptTokens, int completionTokens, string model)
    {
        // Pricing per 1K tokens (approximate)
        var inputPrice = model.Contains("gpt-4o") ? 0.005m : 0.0005m;
        var outputPrice = model.Contains("gpt-4o") ? 0.015m : 0.0015m;

        return ((promptTokens / 1000m) * inputPrice) + ((completionTokens / 1000m) * outputPrice);
    }

    private static string GetDefaultSystemPrompt()
    {
        return "You are RetailFixIt's dispatch assistant. Given a job and candidate vendors, return a JSON tool call `propose_vendors` with up to 3 ranked candidates and per-candidate reasoning (<=200 chars). Never invent vendors. If confidence < 0.6 for the top pick, set \"fallbackToHuman\": true.";
    }
}

public class AIRequest
{
    public Guid RecommendationId { get; set; }
    public Guid TenantId { get; set; }
    public string CorrelationId { get; set; } = string.Empty;
    public string TraceId { get; set; } = string.Empty;
}

public class AICandidate
{
    public string VendorId { get; set; } = string.Empty;
    public decimal Score { get; set; }
    public string Reasoning { get; set; } = string.Empty;
}
