namespace RetailFixIt.Domain.Entities;

public class Vendor
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? CategoriesJson { get; set; }
    public string? RegionsJson { get; set; }
    public decimal? Rating { get; set; }
    public int? CompletedJobs { get; set; }
    public int? ActiveJobs { get; set; }
    public int? Capacity { get; set; }
    public string Status { get; set; } = "active";
    public int? AvgResponseMinutes { get; set; }
    public DateTime? LastActiveAt { get; set; }
    public Guid? EmbeddingId { get; set; }

    public Tenant Tenant { get; set; } = null!;

    public List<string> GetCategories()
    {
        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<List<string>>(CategoriesJson ?? "[]") ?? new();
        }
        catch
        {
            return new();
        }
    }

    public void SetCategories(List<string> categories)
    {
        CategoriesJson = System.Text.Json.JsonSerializer.Serialize(categories);
    }

    public List<string> GetRegions()
    {
        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<List<string>>(RegionsJson ?? "[]") ?? new();
        }
        catch
        {
            return new();
        }
    }

    public void SetRegions(List<string> regions)
    {
        RegionsJson = System.Text.Json.JsonSerializer.Serialize(regions);
    }
}
