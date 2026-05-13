var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHealthChecks();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("AllowAll");

app.MapHealthChecks("/healthz");
app.MapGet("/readyz", () => Results.Ok(new { status = "Ready", timestamp = DateTime.UtcNow }));

app.MapGet("/", () => Results.Ok(new { message = "RetailFixIt API", version = "1.0" }));

app.MapGet("/v1/dashboard/metrics", () => Results.Ok(new
{
    totalJobs = 150,
    pendingDispatch = 12,
    inProgress = 45,
    completedToday = 23,
    avgResponseTime = "2.3h",
    aiMatchRate = 0.87
}));

app.MapGet("/v1/jobs", () => Results.Ok(new
{
    items = new[]
    {
        new { id = "1", reference = "JOB-001", title = "HVAC Repair", status = "pending", priority = "high", customerName = "John Doe" }
    },
    totalCount = 1,
    page = 1,
    pageSize = 20
}));

app.MapGet("/v1/vendors", () => Results.Ok(new
{
    items = new[]
    {
        new { id = "1", name = "Acme Repairs", rating = 4.5, activeJobs = 3, capacity = 10 }
    },
    totalCount = 1,
    page = 1,
    pageSize = 20
}));

app.Run();
