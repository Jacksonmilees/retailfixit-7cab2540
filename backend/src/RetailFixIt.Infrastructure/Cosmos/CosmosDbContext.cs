using Microsoft.Azure.Cosmos;
using System.Text.Json;

namespace RetailFixIt.Infrastructure.Cosmos;

public class CosmosDbContext
{
    private readonly Container _auditContainer;

    public CosmosDbContext(CosmosClient cosmosClient, string databaseName, string containerName)
    {
        var database = cosmosClient.GetDatabase(databaseName);
        _auditContainer = database.GetContainer(containerName);
    }

    public async Task AppendAuditAsync(AuditLogDocument document, CancellationToken ct = default)
    {
        await _auditContainer.CreateItemAsync(document, new PartitionKey(document.TenantId.ToString()), cancellationToken: ct);
    }

    public async Task<AuditLogDocument?> GetAuditAsync(string id, Guid tenantId, CancellationToken ct = default)
    {
        try
        {
            var response = await _auditContainer.ReadItemAsync<AuditLogDocument>(id, new PartitionKey(tenantId.ToString()), cancellationToken: ct);
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<(List<AuditLogDocument> Items, string? ContinuationToken)> QueryAuditAsync(
        Guid tenantId,
        string? entityType = null,
        string? entityId = null,
        string? correlationId = null,
        DateTime? from = null,
        DateTime? to = null,
        int pageSize = 20,
        string? continuationToken = null,
        CancellationToken ct = default)
    {
        var queryBuilder = new List<string> { "SELECT * FROM c WHERE c.tenantId = @tenantId" };
        var parameters = new Dictionary<string, object> { ["@tenantId"] = tenantId.ToString() };

        if (!string.IsNullOrEmpty(entityType))
        {
            queryBuilder.Add("c.entityType = @entityType");
            parameters["@entityType"] = entityType;
        }

        if (!string.IsNullOrEmpty(entityId))
        {
            queryBuilder.Add("c.entityId = @entityId");
            parameters["@entityId"] = entityId;
        }

        if (!string.IsNullOrEmpty(correlationId))
        {
            queryBuilder.Add("c.correlationId = @correlationId");
            parameters["@correlationId"] = correlationId;
        }

        if (from.HasValue)
        {
            queryBuilder.Add("c.createdAt >= @from");
            parameters["@from"] = from.Value.ToString("O");
        }

        if (to.HasValue)
        {
            queryBuilder.Add("c.createdAt <= @to");
            parameters["@to"] = to.Value.ToString("O");
        }

        var query = string.Join(" AND ", queryBuilder) + " ORDER BY c.createdAt DESC";
        var queryDefinition = new QueryDefinition(query);
        foreach (var param in parameters)
        {
            queryDefinition.WithParameter(param.Key, param.Value);
        }

        var requestOptions = new QueryRequestOptions
        {
            PartitionKey = new PartitionKey(tenantId.ToString()),
            MaxItemCount = pageSize
        };

        var iterator = _auditContainer.GetItemQueryIterator<AuditLogDocument>(queryDefinition, continuationToken, requestOptions);
        var response = await iterator.ReadNextAsync(ct);

        return (response.ToList(), response.ContinuationToken);
    }
}

public class AuditLogDocument
{
    public string Id { get; set; } = string.Empty;
    public Guid TenantId { get; set; }
    public string Actor { get; set; } = string.Empty;
    public string? ActorRole { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public Dictionary<string, JsonElement>? Metadata { get; set; }
    public Dictionary<string, JsonElement>? Before { get; set; }
    public Dictionary<string, JsonElement>? After { get; set; }
    public string? CorrelationId { get; set; }
    public string? TraceId { get; set; }
    public string? PrevHash { get; set; }
    public string? Hash { get; set; }
    public DateTime CreatedAt { get; set; }
}
