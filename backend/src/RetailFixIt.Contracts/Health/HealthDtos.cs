namespace RetailFixIt.Contracts.Health;

public class HealthCheckResponse
{
    public string Status { get; set; } = string.Empty;
    public Dictionary<string, HealthCheckComponent> Checks { get; set; } = new();
}

public class HealthCheckComponent
{
    public string Status { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TimeSpan? ResponseTime { get; set; }
    public string? Error { get; set; }
}

public class CircuitBreakerStatusDto
{
    public string Name { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public int FailureCount { get; set; }
    public DateTime? LastFailure { get; set; }
    public DateTime? NextRetry { get; set; }
}

public class ChaosRequest
{
    public string Target { get; set; } = string.Empty; // "openai", "sql", "signalr"
    public string Mode { get; set; } = string.Empty; // "timeout", "500", "slow"
    public int DurationSec { get; set; }
}

public class FeatureFlagDto
{
    public string Key { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public int RolloutPercent { get; set; }
    public List<string> Allowlist { get; set; } = new();
}

public class UpdateFeatureFlagRequest
{
    public bool? Enabled { get; set; }
    public int? RolloutPercent { get; set; }
    public List<string>? Allowlist { get; set; }
}
