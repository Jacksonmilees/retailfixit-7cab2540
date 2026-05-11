using StackExchange.Redis;
using System.Text.Json;

namespace RetailFixIt.Infrastructure.Redis;

public interface IRedisCache
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class;
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default) where T : class;
    Task RemoveAsync(string key, CancellationToken ct = default);
    Task<bool> IdempotencyCheckAsync(string key, CancellationToken ct = default);
    Task IncrementDailyBudgetAsync(Guid tenantId, decimal cost, CancellationToken ct = default);
    Task<decimal?> GetDailyBudgetAsync(Guid tenantId, CancellationToken ct = default);
}

public class RedisCache : IRedisCache
{
    private readonly IDatabase _database;

    public RedisCache(IConnectionMultiplexer connectionMultiplexer)
    {
        _database = connectionMultiplexer.GetDatabase();
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class
    {
        var json = await _database.StringGetAsync(key);
        if (json.IsNullOrEmpty) return null;
        return JsonSerializer.Deserialize<T>(json!);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default) where T : class
    {
        var json = JsonSerializer.Serialize(value);
        await _database.StringSetAsync(key, json, expiry);
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        await _database.KeyDeleteAsync(key);
    }

    public async Task<bool> IdempotencyCheckAsync(string key, CancellationToken ct = default)
    {
        var exists = await _database.KeyExistsAsync(key);
        if (exists) return false;
        await _database.StringSetAsync(key, "1", TimeSpan.FromHours(24));
        return true;
    }

    public async Task IncrementDailyBudgetAsync(Guid tenantId, decimal cost, CancellationToken ct = default)
    {
        var key = $"budget:{tenantId}:{DateTime.UtcNow:yyyy-MM-dd}";
        await _database.StringIncrementAsync(key, (double)cost);
        await _database.KeyExpireAsync(key, TimeSpan.FromHours(26));
    }

    public async Task<decimal?> GetDailyBudgetAsync(Guid tenantId, CancellationToken ct = default)
    {
        var key = $"budget:{tenantId}:{DateTime.UtcNow:yyyy-MM-dd}";
        var value = await _database.StringGetAsync(key);
        if (value.IsNullOrEmpty) return null;
        return (decimal)(double)value;
    }
}
