namespace RetailFixIt.Domain.Events;

public abstract class DomainEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public string CorrelationId { get; set; } = string.Empty;
    public string TraceId { get; set; } = string.Empty;
}

public class JobCreatedEvent : DomainEvent
{
    public Guid JobId { get; set; }
    public Guid TenantId { get; set; }
    public string Reference { get; set; } = string.Empty;
}

public class JobUpdatedEvent : DomainEvent
{
    public Guid JobId { get; set; }
    public Guid TenantId { get; set; }
    public string? Status { get; set; }
    public Dictionary<string, object?> Changes { get; set; } = new();
}

public class JobAssignedEvent : DomainEvent
{
    public Guid JobId { get; set; }
    public Guid TenantId { get; set; }
    public Guid VendorId { get; set; }
    public string AssignedBy { get; set; } = string.Empty;
    public string? Source { get; set; }
    public string? Reason { get; set; }
}

public class AssignmentAcceptedEvent : DomainEvent
{
    public Guid AssignmentId { get; set; }
    public Guid JobId { get; set; }
    public Guid TenantId { get; set; }
    public Guid VendorId { get; set; }
}

public class AssignmentDeclinedEvent : DomainEvent
{
    public Guid AssignmentId { get; set; }
    public Guid JobId { get; set; }
    public Guid TenantId { get; set; }
    public string? Reason { get; set; }
}

public class AssignmentCompletedEvent : DomainEvent
{
    public Guid AssignmentId { get; set; }
    public Guid JobId { get; set; }
    public Guid TenantId { get; set; }
}

public class AIRecommendationRequestedEvent : DomainEvent
{
    public Guid RecommendationId { get; set; }
    public Guid JobId { get; set; }
    public Guid TenantId { get; set; }
}

public class AIRecommendationReadyEvent : DomainEvent
{
    public Guid RecommendationId { get; set; }
    public Guid JobId { get; set; }
    public Guid TenantId { get; set; }
    public bool FallbackUsed { get; set; }
}

public class VendorUpdatedEvent : DomainEvent
{
    public Guid VendorId { get; set; }
    public Guid TenantId { get; set; }
}
