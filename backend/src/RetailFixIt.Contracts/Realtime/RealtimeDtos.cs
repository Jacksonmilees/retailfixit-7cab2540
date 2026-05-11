namespace RetailFixIt.Contracts.Realtime;

public class RealtimeEvent<T> where T : class
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string OccurredAt { get; set; } = string.Empty;
    public T Payload { get; set; } = null!;
}

public class RealtimeEventTypes
{
    public const string JobCreated = "job.created";
    public const string JobUpdated = "job.updated";
    public const string JobAssigned = "job.assigned";
    public const string AIRecommendationRequested = "ai.recommendation.requested";
    public const string AIRecommendationReady = "ai.recommendation.ready";
    public const string AIRecommendationFailed = "ai.recommendation.failed";
    public const string VendorUpdated = "vendor.updated";
    public const string AssignmentAccepted = "assignment.accepted";
    public const string AssignmentDeclined = "assignment.declined";
    public const string AssignmentCompleted = "assignment.completed";
    public const string AuditAppended = "audit.appended";
    public const string OpsHealthChanged = "ops.health.changed";
}

public class SignalRNegotiateResponse
{
    public string Url { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
}
