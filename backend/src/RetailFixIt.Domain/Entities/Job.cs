namespace RetailFixIt.Domain.Entities;

public class Job
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Region { get; set; }
    public string? Category { get; set; }
    public string? Status { get; set; } = "new";
    public string? Priority { get; set; } = "normal";
    public DateTime? SlaDueAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public Guid? AssignedVendorId { get; set; }
    public DateTime? AssignedAt { get; set; }
    public decimal? EstimatedValue { get; set; }
    public byte? ComplexityScore { get; set; }
    public string? EscalationRisk { get; set; }
    public string? AiSummary { get; set; }
    public byte[]? RowVersion { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Vendor? AssignedVendor { get; set; }
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
    public ICollection<AIRecommendation> AIRecommendations { get; set; } = new List<AIRecommendation>();
}
