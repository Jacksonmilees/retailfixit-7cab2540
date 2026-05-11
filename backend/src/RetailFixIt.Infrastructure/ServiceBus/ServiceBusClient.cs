using Azure.Messaging.ServiceBus;
using System.Text.Json;

namespace RetailFixIt.Infrastructure.ServiceBus;

public interface IEventPublisher
{
    Task PublishAsync<T>(string subject, T payload, Guid tenantId, string correlationId, string traceId, CancellationToken ct = default) where T : class;
}

public class ServiceBusEventPublisher : IEventPublisher, IAsyncDisposable
{
    private readonly ServiceBusSender _sender;

    public ServiceBusEventPublisher(ServiceBusClient client, string topicName)
    {
        _sender = client.CreateSender(topicName);
    }

    public async Task PublishAsync<T>(
        string subject,
        T payload,
        Guid tenantId,
        string correlationId,
        string traceId,
        CancellationToken ct = default) where T : class
    {
        var json = JsonSerializer.Serialize(payload);
        var message = new ServiceBusMessage(json)
        {
            Subject = subject,
            SessionId = tenantId.ToString(),
            ApplicationProperties =
            {
                ["tenantId"] = tenantId.ToString(),
                ["correlationId"] = correlationId,
                ["traceId"] = traceId
            }
        };

        await _sender.SendMessageAsync(message, ct);
    }

    public async ValueTask DisposeAsync()
    {
        await _sender.DisposeAsync();
    }
}
