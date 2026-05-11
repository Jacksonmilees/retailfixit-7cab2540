using RetailFixIt.Infrastructure.Redis;

namespace RetailFixIt.Api.Middleware;

public class IdempotencyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<IdempotencyMiddleware> _logger;

    public IdempotencyMiddleware(RequestDelegate next, ILogger<IdempotencyMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IRedisCache redisCache)
    {
        // Check for idempotency key on mutating requests
        if (IsMutatingRequest(context.Request.Method))
        {
            var idempotencyKey = context.Request.Headers["Idempotency-Key"].FirstOrDefault();
            var tenantId = context.User.FindFirst("tid")?.Value ?? "unknown";

            if (!string.IsNullOrEmpty(idempotencyKey))
            {
                var cacheKey = $"idem:{tenantId}:{idempotencyKey}";
                var isNew = await redisCache.IdempotencyCheckAsync(cacheKey);

                if (!isNew)
                {
                    _logger.LogWarning("Duplicate request detected: {IdempotencyKey}", idempotencyKey);
                    context.Response.StatusCode = StatusCodes.Status409Conflict;
                    await context.Response.WriteAsync("Duplicate request");
                    return;
                }
            }
        }

        await _next(context);
    }

    private static bool IsMutatingRequest(string method)
    {
        return method.Equals("POST", StringComparison.OrdinalIgnoreCase) ||
               method.Equals("PUT", StringComparison.OrdinalIgnoreCase) ||
               method.Equals("PATCH", StringComparison.OrdinalIgnoreCase) ||
               method.Equals("DELETE", StringComparison.OrdinalIgnoreCase);
    }
}
