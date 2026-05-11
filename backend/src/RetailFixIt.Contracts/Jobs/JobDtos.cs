using RetailFixIt.Contracts.Common;

namespace RetailFixIt.Contracts.Jobs;

public class JobDto
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string SlaDueAt { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
    public string? AssignedVendorId { get; set; }
    public string? AssignedAt { get; set; }
    public decimal EstimatedValue { get; set; }
    public int? ComplexityScore { get; set; }
    public string? EscalationRisk { get; set; }
    public string? AiSummary { get; set; }
}

public class JobListQuery : PageQuery
{
    public List<string>? Status { get; set; }
    public List<string>? Priority { get; set; }
    public List<string>? Category { get; set; }
    public List<string>? Region { get; set; }
}

public class CreateJobRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Region { get; set; }
    public string? Category { get; set; }
    public string? Priority { get; set; }
    public DateTime? SlaDueAt { get; set; }
    public decimal? EstimatedValue { get; set; }
}

public class UpdateJobRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Region { get; set; }
    public string? Category { get; set; }
    public string? SlaDueAt { get; set; }
    public decimal? EstimatedValue { get; set; }
    public int? ComplexityScore { get; set; }
    public string? EscalationRisk { get; set; }
    public string? AiSummary { get; set; }
}

public class AssignJobRequest
{
    public string VendorId { get; set; } = string.Empty;
    public string? Source { get; set; } // "human" or "ai"
    public string? Reason { get; set; }
}

public class CancelJobRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class TimelineQuery : PageQuery
{
    public string? CorrelationId { get; set; }
}

public class JobSummaryRequest
{
    public string Raw { get; set; } = string.Empty;
}

public class JobSummaryResponse
{
    public string Summary { get; set; } = string.Empty;
}
