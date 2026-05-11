namespace RetailFixIt.Domain.Entities;

public class AIPromptVersion
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Version { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty; // "recommendation", "summary", etc.
    public string SystemPrompt { get; set; } = string.Empty;
    public string? ToolSchemaJson { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ActivatedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
}
