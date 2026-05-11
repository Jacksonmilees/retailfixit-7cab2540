using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RetailFixIt.Domain.Enums;
using RetailFixIt.Infrastructure.Data;
using RetailFixIt.Infrastructure.ServiceBus;
using System.Text.Json;

namespace RetailFixIt.Workers.Functions;

public class OutboxDispatcherFunction
{
    private readonly ILogger<OutboxDispatcherFunction> _logger;
    private readonly RetailFixItDbContext _dbContext;
    private readonly IEventPublisher _publisher;

    public OutboxDispatcherFunction(
        ILogger<OutboxDispatcherFunction> logger,
        RetailFixItDbContext dbContext,
        IEventPublisher publisher)
    {
        _logger = logger;
        _dbContext = dbContext;
        _publisher = publisher;
    }

    [Function("OutboxDispatcher")]
    public async Task Run(
        [TimerTrigger("*/30 * * * * *")] TimerInfo timer,  // Every 30 seconds
        FunctionContext context)
    {
        var messages = await _dbContext.OutboxMessages
            .Where(m => m.ProcessedAt == null && m.Attempts < 5)
            .OrderBy(m => m.CreatedAt)
            .Take(100)
            .ToListAsync();

        foreach (var message in messages)
        {
            try
            {
                TenantContext.Current = message.TenantId;

                // Deserialize payload
                var payload = JsonSerializer.Deserialize<JsonElement>(message.PayloadJson);

                // Publish to Service Bus
                await _publisher.PublishAsync(
                    message.Type,
                    payload,
                    message.TenantId,
                    message.CorrelationId,
                    message.CorrelationId);

                // Mark as processed
                message.ProcessedAt = DateTime.UtcNow;
                message.Attempts++;

                _logger.LogInformation(
                    "Outbox message {MessageId} of type {Type} dispatched successfully",
                    message.Id, message.Type);
            }
            catch (Exception ex)
            {
                message.Attempts++;
                _logger.LogError(ex,
                    "Failed to dispatch outbox message {MessageId} (attempt {Attempt})",
                    message.Id, message.Attempts);
            }
            finally
            {
                TenantContext.Clear();
            }
        }

        await _dbContext.SaveChangesAsync();

        // Clean up old processed messages (older than 7 days)
        var cutoff = DateTime.UtcNow.AddDays(-7);
        var oldMessages = await _dbContext.OutboxMessages
            .Where(m => m.ProcessedAt != null && m.ProcessedAt < cutoff)
            .ToListAsync();

        if (oldMessages.Any())
        {
            _dbContext.OutboxMessages.RemoveRange(oldMessages);
            await _dbContext.SaveChangesAsync();
            _logger.LogInformation("Cleaned up {Count} old outbox messages", oldMessages.Count);
        }
    }
}
