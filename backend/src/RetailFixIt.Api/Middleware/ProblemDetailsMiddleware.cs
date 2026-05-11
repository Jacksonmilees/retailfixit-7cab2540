using RetailFixIt.Contracts.Common;
using System.Net;
using System.Text.Json;

namespace RetailFixIt.Api.Middleware;

public class ProblemDetailsMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ProblemDetailsMiddleware> _logger;

    public ProblemDetailsMiddleware(RequestDelegate next, ILogger<ProblemDetailsMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var problemDetails = exception switch
        {
            UnauthorizedAccessException => new ProblemDetails
            {
                Type = "https://api.retailfixit.io/errors/unauthorized",
                Title = "Unauthorized",
                Status = (int)HttpStatusCode.Unauthorized,
                Detail = exception.Message,
                TraceId = context.TraceIdentifier
            },
            KeyNotFoundException => new ProblemDetails
            {
                Type = "https://api.retailfixit.io/errors/not-found",
                Title = "Resource not found",
                Status = (int)HttpStatusCode.NotFound,
                Detail = exception.Message,
                TraceId = context.TraceIdentifier
            },
            FluentValidation.ValidationException ve => new ProblemDetails
            {
                Type = "https://api.retailfixit.io/errors/validation",
                Title = "Validation failed",
                Status = (int)HttpStatusCode.BadRequest,
                Detail = exception.Message,
                TraceId = context.TraceIdentifier,
                Errors = ve.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToList())
            },
            _ => new ProblemDetails
            {
                Type = "https://api.retailfixit.io/errors/internal",
                Title = "Internal server error",
                Status = (int)HttpStatusCode.InternalServerError,
                Detail = "An unexpected error occurred",
                TraceId = context.TraceIdentifier
            }
        };

        context.Response.StatusCode = problemDetails.Status;
        await context.Response.WriteAsync(JsonSerializer.Serialize(problemDetails));
    }
}
