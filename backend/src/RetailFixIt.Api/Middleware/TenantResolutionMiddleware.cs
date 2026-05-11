using RetailFixIt.Infrastructure.Data;
using System.Security.Claims;

namespace RetailFixIt.Api.Middleware;

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Try to get tenant from JWT claim
        var tenantIdClaim = context.User.FindFirst("tid")?.Value;

        // Admin override via header
        if (!string.IsNullOrEmpty(context.Request.Headers["X-Tenant-Id"]))
        {
            var userRoles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value);
            if (userRoles.Contains("admin"))
            {
                tenantIdClaim = context.Request.Headers["X-Tenant-Id"];
            }
        }

        if (!string.IsNullOrEmpty(tenantIdClaim) && Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            TenantContext.Current = tenantId;
        }

        try
        {
            await _next(context);
        }
        finally
        {
            TenantContext.Clear();
        }
    }
}
