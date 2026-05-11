using RetailFixIt.Contracts.Common;

namespace RetailFixIt.Contracts.Audit;

public class AuditLogDto
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string? ActorRole { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public Dictionary<string, object>? Metadata { get; set; }
    public Dictionary<string, object>? Before { get; set; }
    public Dictionary<string, object>? After { get; set; }
    public string? CorrelationId { get; set; }
    public string? TraceId { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
}

public class AuditListQuery : PageQuery
{
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? CorrelationId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
}
