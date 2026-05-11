using RetailFixIt.Contracts.Common;

namespace RetailFixIt.Contracts.Assignments;

public class AssignmentDto
{
    public string Id { get; set; } = string.Empty;
    public string JobId { get; set; } = string.Empty;
    public string VendorId { get; set; } = string.Empty;
    public string AssignedBy { get; set; } = string.Empty;
    public string AssignedAt { get; set; } = string.Empty;
    public string? AcceptedAt { get; set; }
    public string? CompletedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class AssignmentListQuery : PageQuery
{
    public string? VendorId { get; set; }
    public string? JobId { get; set; }
}

public class DeclineAssignmentRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class CompleteAssignmentRequest
{
    public List<string>? PartsUsed { get; set; }
    public decimal? InvoiceTotal { get; set; }
    public List<string>? Photos { get; set; }
}
