namespace RetailFixIt.Domain.Entities;

public class Assignment
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid JobId { get; set; }
    public Guid VendorId { get; set; }
    public string AssignedBy { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string Status { get; set; } = "pending";
    public string? Notes { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Job Job { get; set; } = null!;
    public Vendor Vendor { get; set; } = null!;
}
