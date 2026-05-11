using RetailFixIt.Contracts.Common;

namespace RetailFixIt.Contracts.AI;

public class AIRecommendationDto
{
    public string Id { get; set; } = string.Empty;
    public string JobId { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string ModelVersion { get; set; } = string.Empty;
    public int LatencyMs { get; set; }
    public List<AICandidateDto> Candidates { get; set; } = new();
    public decimal Confidence { get; set; }
    public bool FallbackUsed { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? AcceptedVendorId { get; set; }
    public string? OverrideReason { get; set; }
}

public class AICandidateDto
{
    public string VendorId { get; set; } = string.Empty;
    public decimal Score { get; set; }
    public string Reasoning { get; set; } = string.Empty;
}

public class AIRecommendationRequest
{
    public string JobId { get; set; } = string.Empty;
}

public class AISummaryRequest
{
    public string JobId { get; set; } = string.Empty;
    public string Raw { get; set; } = string.Empty;
}

public class AISummaryResponse
{
    public string Summary { get; set; } = string.Empty;
}

public class AIGovernanceDto
{
    public bool Enabled { get; set; }
    public string? PinnedModelVersion { get; set; }
    public string? PinnedPromptVersion { get; set; }
    public double Temperature { get; set; }
    public double TopP { get; set; }
    public decimal? ConfidenceFloor { get; set; }
    public int? MaxTokensPerRecommendation { get; set; }
    public decimal? DailyBudgetUsd { get; set; }
    public bool PiiRedactionRequired { get; set; }
}

public class UpdateAIGovernanceRequest
{
    public bool? Enabled { get; set; }
    public string? PinnedModelVersion { get; set; }
    public string? PinnedPromptVersion { get; set; }
    public double? Temperature { get; set; }
    public double? TopP { get; set; }
    public decimal? ConfidenceFloor { get; set; }
    public int? MaxTokensPerRecommendation { get; set; }
    public decimal? DailyBudgetUsd { get; set; }
    public bool? PiiRedactionRequired { get; set; }
}

public class AIPromptVersionDto
{
    public string Id { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string? ActivatedAt { get; set; }
}

public class AIEvalRunDto
{
    public string Id { get; set; } = string.Empty;
    public string StartedAt { get; set; } = string.Empty;
    public string? CompletedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal? Top1Accuracy { get; set; }
    public decimal? Top3Recall { get; set; }
    public decimal? HallucinationRate { get; set; }
    public int? LatencyP50 { get; set; }
    public int? LatencyP95 { get; set; }
}
