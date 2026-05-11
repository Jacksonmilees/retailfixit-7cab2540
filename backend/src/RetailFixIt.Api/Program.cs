using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RetailFixIt.Api.Endpoints;
using RetailFixIt.Api.Middleware;
using RetailFixIt.Api.SignalR;
using RetailFixIt.Cosmos;
using RetailFixIt.Infrastructure.Cosmos;
using RetailFixIt.Infrastructure.Data;
using RetailFixIt.Infrastructure.OpenAI;
using RetailFixIt.Infrastructure.Redis;
using RetailFixIt.Infrastructure.ServiceBus;
using RetailFixIt.Infrastructure.SignalR;
using StackExchange.Redis;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Configuration
var configuration = builder.Configuration;

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "RetailFixIt API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var key = Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!);
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = configuration["Jwt:Issuer"],
            ValidAudience = configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(key)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("jobs:assign", policy => policy.RequireRole("admin", "dispatcher"));
    options.AddPolicy("jobs:create", policy => policy.RequireRole("admin", "dispatcher"));
    options.AddPolicy("vendors:manage", policy => policy.RequireRole("admin", "vendor_manager"));
    options.AddPolicy("ai:governance", policy => policy.RequireRole("admin"));
    options.AddPolicy("ops:admin", policy => policy.RequireRole("admin"));
});

// SignalR
builder.Services.AddSignalR().AddJsonProtocol();

// EF Core with SQL Server
builder.Services.AddDbContext<RetailFixItDbContext>((sp, options) =>
{
    options.UseSqlServer(configuration.GetConnectionString("SqlServer"), sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(6);
        sqlOptions.ExecutionStrategy(d => new Microsoft.EntityFrameworkCore.SqlServerRetryingExecutionStrategy(d, 6));
    });
    options.AddInterceptors(new TenantDbConnectionInterceptor());
});

// Redis
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
    ConnectionMultiplexer.Connect(configuration.GetConnectionString("Redis")!));
builder.Services.AddScoped<IRedisCache, RedisCache>();

// Cosmos DB
builder.Services.AddSingleton(sp =>
{
    var cosmosClient = new Microsoft.Azure.Cosmos.CosmosClient(
        configuration["Cosmos:Endpoint"],
        configuration["Cosmos:Key"]);
    return cosmosClient;
});
builder.Services.AddScoped<CosmosDbContext>(sp =>
{
    var client = sp.GetRequiredService<Microsoft.Azure.Cosmos.CosmosClient>();
    return new CosmosDbContext(client, configuration["Cosmos:Database"]!, "audit");
});

// Service Bus
builder.Services.AddSingleton<Azure.Messaging.ServiceBus.ServiceBusClient>(sp =>
    new Azure.Messaging.ServiceBus.ServiceBusClient(configuration["ServiceBus:ConnectionString"]));
builder.Services.AddScoped<IEventPublisher>(sp =>
{
    var client = sp.GetRequiredService<Azure.Messaging.ServiceBus.ServiceBusClient>();
    return new ServiceBusEventPublisher(client, configuration["ServiceBus:TopicName"] ?? "events");
});

// Azure OpenAI
builder.Services.AddSingleton<IOpenAIClient>(sp =>
    new AzureOpenAIClient(
        configuration["OpenAI:Endpoint"]!,
        configuration["OpenAI:Key"]!));

// SignalR Notifier
builder.Services.AddScoped<IRealtimeNotifier, SignalRRealtimeNotifier>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                configuration["Frontend:Url"] ?? "http://localhost:3000",
                configuration["Frontend:Url"] ?? "http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Health checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<RetailFixItDbContext>("sql")
    .AddRedis("redis")
    .AddCheck<ServiceBusHealthCheck>("servicebus");

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// Middleware
app.UseMiddleware<TenantResolutionMiddleware>();
app.UseMiddleware<IdempotencyMiddleware>();
app.UseMiddleware<ProblemDetailsMiddleware>();

// Map endpoints
app.MapHealthChecks("/healthz");
app.MapHealthChecks("/readyz");

// Auth endpoints
app.MapAuthEndpoints();

// Dashboard endpoints
app.MapDashboardEndpoints();

// Job endpoints
app.MapJobEndpoints();

// Vendor endpoints
app.MapVendorEndpoints();

// Assignment endpoints
app.MapAssignmentEndpoints();

// AI endpoints
app.MapAIEndpoints();

// Audit endpoints
app.MapAuditEndpoints();

// Users endpoints
app.MapUserEndpoints();

// Realtime endpoints
app.MapRealtimeEndpoints();

// Ops endpoints
app.MapOpsEndpoints();

// Detailed health endpoints
app.MapDetailedHealthEndpoints();

// Report endpoints (PDF, CSV)
app.MapReportEndpoints();

// Webhook endpoints
app.MapWebhookEndpoints();

// SignalR hub
app.MapHub<OpsHub>("/hubs/ops");

app.Run();
