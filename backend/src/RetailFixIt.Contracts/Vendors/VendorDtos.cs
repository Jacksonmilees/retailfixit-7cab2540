using RetailFixIt.Contracts.Common;

namespace RetailFixIt.Contracts.Vendors;

public class VendorDto
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public List<string> Categories { get; set; } = new();
    public List<string> Regions { get; set; } = new();
    public decimal Rating { get; set; }
    public int CompletedJobs { get; set; }
    public int ActiveJobs { get; set; }
    public int Capacity { get; set; }
    public string Status { get; set; } = string.Empty;
    public int AvgResponseMinutes { get; set; }
    public string LastActiveAt { get; set; } = string.Empty;
}

public class VendorListQuery : PageQuery
{
    public List<string>? Category { get; set; }
    public List<string>? Region { get; set; }
}

public class UpdateVendorRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public List<string>? Categories { get; set; }
    public List<string>? Regions { get; set; }
    public decimal? Rating { get; set; }
    public int? Capacity { get; set; }
    public string? Status { get; set; }
    public int? AvgResponseMinutes { get; set; }
}

public class VendorScorecardDto
{
    public string VendorId { get; set; } = string.Empty;
    public decimal AcceptanceRate { get; set; }
    public decimal OnTimeRate { get; set; }
    public decimal AIFitScore { get; set; }
    public int TotalCompletedJobs { get; set; }
    public int TotalDeclinedJobs { get; set; }
    public decimal AverageRating { get; set; }
}
