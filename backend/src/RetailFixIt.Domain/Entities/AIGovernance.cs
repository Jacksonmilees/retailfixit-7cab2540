namespace RetailFixIt.Domain.Entities;

public class AIGovernance
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public bool Enabled { get; set; } = true;
    public string? PinnedModelVersion { get; set; }
    public string? PinnedPromptVersion { get; set; }
    public double Temperature { get; set; } = 0.2;
    public double TopP { get; set; } = 0.9;
    public decimal? ConfidenceFloor { get; set; } = 0.6m;
    public int? MaxTokensPerRecommendation { get; set; } = 600;
    public decimal? DailyBudgetUsd { get; set; } = 100m;
    public bool PiiRedactionRequired { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
}
