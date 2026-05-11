namespace RetailFixIt.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string RolesJson { get; set; } = "[]";
    public Guid? EntraObjectId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;

    public List<string> GetRoles()
    {
        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<List<string>>(RolesJson) ?? new();
        }
        catch
        {
            return new();
        }
    }

    public void SetRoles(List<string> roles)
    {
        RolesJson = System.Text.Json.JsonSerializer.Serialize(roles);
    }
}
