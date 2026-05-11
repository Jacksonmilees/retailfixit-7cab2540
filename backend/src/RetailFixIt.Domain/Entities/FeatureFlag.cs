namespace RetailFixIt.Domain.Entities;

public class FeatureFlag
{
    public Guid TenantId { get; set; }
    public string Key { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public byte RolloutPercent { get; set; }
    public string? AllowlistJson { get; set; }

    public Tenant Tenant { get; set; } = null!;

    public List<string> GetAllowlist()
    {
        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<List<string>>(AllowlistJson ?? "[]") ?? new();
        }
        catch
        {
            return new();
        }
    }

    public void SetAllowlist(List<string> allowlist)
    {
        AllowlistJson = System.Text.Json.JsonSerializer.Serialize(allowlist);
    }
}
