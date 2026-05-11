namespace RetailFixIt.Domain.Entities;

public class AIRecommendation
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid JobId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? ModelVersion { get; set; }
    public string? PromptVersion { get; set; }
    public int? LatencyMs { get; set; }
    public decimal? Confidence { get; set; }
    public bool FallbackUsed { get; set; }
    public string? Status { get; set; } = "pending";
    public string? CandidatesJson { get; set; }
    public Guid? AcceptedVendorId { get; set; }
    public string? OverrideReason { get; set; }
    public int? PromptTokens { get; set; }
    public int? CompletionTokens { get; set; }
    public decimal? CostUsd { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Job Job { get; set; } = null!;

    public List<AICandidate> GetCandidates()
    {
        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<List<AICandidate>>(CandidatesJson ?? "[]") ?? new();
        }
        catch
        {
            return new();
        }
    }

    public void SetCandidates(List<AICandidate> candidates)
    {
        CandidatesJson = System.Text.Json.JsonSerializer.Serialize(candidates);
    }
}

public class AICandidate
{
    public string VendorId { get; set; } = string.Empty;
    public decimal Score { get; set; }
    public string Reasoning { get; set; } = string.Empty;
}
