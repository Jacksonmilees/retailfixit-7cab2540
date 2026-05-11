using Microsoft.AspNetCore.SignalR;
using System.Text.Json;

namespace RetailFixIt.Infrastructure.SignalR;

public interface IRealtimeNotifier
{
    Task SendToTenantAsync<T>(Guid tenantId, string eventType, T payload, CancellationToken ct = default) where T : class;
    Task SendToJobGroupAsync<T>(Guid jobId, string eventType, T payload, CancellationToken ct = default) where T : class;
}

public class SignalRRealtimeNotifier : IRealtimeNotifier
{
    private readonly IHubContext<OpsHub> _hubContext;

    public SignalRRealtimeNotifier(IHubContext<OpsHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task SendToTenantAsync<T>(Guid tenantId, string eventType, T payload, CancellationToken ct = default) where T : class
    {
        var evt = new RealtimeEvent<T>
        {
            Id = Guid.NewGuid().ToString("N"),
            Type = eventType,
            TenantId = tenantId.ToString(),
            OccurredAt = DateTime.UtcNow.ToString("O"),
            Payload = payload
        };

        await _hubContext.Clients.Group($"t:{tenantId}").SendAsync("event", evt, cancellationToken: ct);
    }

    public async Task SendToJobGroupAsync<T>(Guid jobId, string eventType, T payload, CancellationToken ct = default) where T : class
    {
        var evt = new RealtimeEvent<T>
        {
            Id = Guid.NewGuid().ToString("N"),
            Type = eventType,
            TenantId = "",
            OccurredAt = DateTime.UtcNow.ToString("O"),
            Payload = payload
        };

        await _hubContext.Clients.Group($"j:{jobId}").SendAsync("event", evt, cancellationToken: ct);
    }
}

public class OpsHub : Hub
{
    public async Task SubscribeJob(string jobId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"j:{jobId}");
    }

    public async Task UnsubscribeJob(string jobId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"j:{jobId}");
    }

    public override async Task OnConnectedAsync()
    {
        // Add to tenant group based on JWT claim
        var tenantId = Context.User?.FindFirst("tid")?.Value;
        if (!string.IsNullOrEmpty(tenantId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"t:{tenantId}");
        }
        await base.OnConnectedAsync();
    }
}

public class RealtimeEvent<T> where T : class
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string OccurredAt { get; set; } = string.Empty;
    public T Payload { get; set; } = null!;
}
