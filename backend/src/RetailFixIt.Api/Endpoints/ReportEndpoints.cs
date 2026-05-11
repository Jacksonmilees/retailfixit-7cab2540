using CsvHelper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using RetailFixIt.Contracts.Audit;
using RetailFixIt.Domain.Enums;
using RetailFixIt.Infrastructure.Cosmos;
using RetailFixIt.Infrastructure.Data;
using System.Globalization;

namespace RetailFixIt.Api.Endpoints;

public static class ReportEndpoints
{
    public static IEndpointRouteBuilder MapReportEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1").RequireAuthorization();

        // GET /v1/jobs/{id}/report.pdf
        group.MapGet("/jobs/{id:guid}/report.pdf", async (
            Guid id,
            RetailFixItDbContext db,
            CancellationToken ct) =>
        {
            var job = await db.Jobs.FindAsync(new object[] { id }, ct);
            if (job == null) return Results.NotFound();

            var assignments = await db.Assignments
                .Where(a => a.JobId == id)
                .Include(a => a.Vendor)
                .ToListAsync(ct);

            var auditLogs = await db.OutboxMessages
                .Where(o => o.PayloadJson.Contains(id.ToString()))
                .OrderBy(o => o.CreatedAt)
                .ToListAsync(ct);

            var vendor = assignments.FirstOrDefault()?.Vendor;
            var currentAssignment = assignments.OrderByDescending(a => a.AssignedAt).FirstOrDefault();

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(11).FontFamily("Arial"));

                    page.Header()
                        .Text($"Job Report: {job.Reference}")
                        .SemiBold().FontSize(20).FontColor(Colors.Blue.Darken2);

                    page.Content()
                        .PaddingVertical(1, Unit.Centimetre)
                        .Column(column =>
                        {
                            // Job Details Section
                            column.Item().Text("Job Details").SemiBold().FontSize(14).FontColor(Colors.Grey.Darken3);
                            column.Item().PaddingVertical(5);
                            
                            column.Item().Table(table =>
                            {
                                table.ColumnsDefinition(columns =>
                                {
                                    columns.ConstantColumn(120);
                                    columns.RelativeColumn();
                                });

                                table.Cell().Text("Reference:");
                                table.Cell().Text(job.Reference);
                                
                                table.Cell().Text("Title:");
                                table.Cell().Text(job.Title);
                                
                                table.Cell().Text("Status:");
                                table.Cell().Text(job.Status ?? "unknown");
                                
                                table.Cell().Text("Priority:");
                                table.Cell().Text(job.Priority ?? "normal");
                                
                                table.Cell().Text("Category:");
                                table.Cell().Text(job.Category ?? "N/A");
                                
                                table.Cell().Text("Created:");
                                table.Cell().Text(job.CreatedAt.ToString("yyyy-MM-dd HH:mm"));
                            });

                            column.Item().PaddingVertical(10);

                            // Customer Details
                            column.Item().Text("Customer Details").SemiBold().FontSize(14).FontColor(Colors.Grey.Darken3);
                            column.Item().PaddingVertical(5);
                            
                            column.Item().Table(table =>
                            {
                                table.ColumnsDefinition(columns =>
                                {
                                    columns.ConstantColumn(120);
                                    columns.RelativeColumn();
                                });

                                table.Cell().Text("Name:");
                                table.Cell().Text(job.CustomerName ?? "N/A");
                                
                                table.Cell().Text("Phone:");
                                table.Cell().Text(job.CustomerPhone ?? "N/A");
                                
                                table.Cell().Text("Address:");
                                table.Cell().Text($"{job.Address ?? "N/A"}, {job.City ?? ""}, {job.Region ?? ""}");
                            });

                            column.Item().PaddingVertical(10);

                            // Assignment Details
                            if (currentAssignment != null)
                            {
                                column.Item().Text("Assignment").SemiBold().FontSize(14).FontColor(Colors.Grey.Darken3);
                                column.Item().PaddingVertical(5);
                                
                                column.Item().Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.ConstantColumn(120);
                                        columns.RelativeColumn();
                                    });

                                    table.Cell().Text("Vendor:");
                                    table.Cell().Text(vendor?.Name ?? "N/A");
                                    
                                    table.Cell().Text("Status:");
                                    table.Cell().Text(currentAssignment.Status);
                                    
                                    table.Cell().Text("Assigned:");
                                    table.Cell().Text(currentAssignment.AssignedAt.ToString("yyyy-MM-dd HH:mm"));
                                    
                                    if (currentAssignment.AcceptedAt.HasValue)
                                    {
                                        table.Cell().Text("Accepted:");
                                        table.Cell().Text(currentAssignment.AcceptedAt.Value.ToString("yyyy-MM-dd HH:mm"));
                                    }
                                    
                                    if (currentAssignment.CompletedAt.HasValue)
                                    {
                                        table.Cell().Text("Completed:");
                                        table.Cell().Text(currentAssignment.CompletedAt.Value.ToString("yyyy-MM-dd HH:mm"));
                                    }
                                });
                            }

                            column.Item().PaddingVertical(10);

                            // Description
                            if (!string.IsNullOrEmpty(job.Description))
                            {
                                column.Item().Text("Description").SemiBold().FontSize(14).FontColor(Colors.Grey.Darken3);
                                column.Item().PaddingVertical(5);
                                column.Item().Text(job.Description);
                            }

                            // AI Summary
                            if (!string.IsNullOrEmpty(job.AiSummary))
                            {
                                column.Item().PaddingVertical(10);
                                column.Item().Text("AI Summary").SemiBold().FontSize(14).FontColor(Colors.Blue.Darken2);
                                column.Item().PaddingVertical(5);
                                column.Item().Background(Colors.Grey.Lighten4).Padding(10).Text(job.AiSummary);
                            }
                        });

                    page.Footer()
                        .AlignCenter()
                        .Text(x =>
                        {
                            x.Span("Page ");
                            x.CurrentPageNumber();
                            x.Span(" of ");
                            x.TotalPages();
                        });
                });
            });

            var pdfBytes = document.GeneratePdf();
            return Results.File(pdfBytes, "application/pdf", $"job-{job.Reference}.pdf");
        });

        // GET /v1/audit/export?format=csv|json
        group.MapGet("/audit/export", async (
            [FromQuery] string format,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            CosmosDbContext cosmos,
            CancellationToken ct) =>
        {
            var tenantId = TenantContext.Current!.Value;
            
            // Default to last 30 days if no dates specified
            var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
            var toDate = to ?? DateTime.UtcNow;

            var (items, _) = await cosmos.QueryAuditAsync(
                tenantId,
                from: fromDate,
                to: toDate,
                pageSize: 10000,  // Max for export
                ct: ct);

            var dtos = items.Select(a => new AuditLogDto
            {
                Id = a.Id,
                TenantId = a.TenantId.ToString(),
                Actor = a.Actor,
                ActorRole = a.ActorRole,
                Action = a.Action,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                CorrelationId = a.CorrelationId,
                TraceId = a.TraceId,
                CreatedAt = a.CreatedAt.ToString("O")
            }).ToList();

            if (format?.ToLower() == "csv")
            {
                using var memoryStream = new MemoryStream();
                using var writer = new StreamWriter(memoryStream);
                using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
                
                csv.WriteRecords(dtos);
                await writer.FlushAsync();
                
                return Results.File(
                    memoryStream.ToArray(),
                    "text/csv",
                    $"audit-export-{DateTime.UtcNow:yyyyMMdd}.csv");
            }
            else // JSON
            {
                return Results.File(
                    System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(dtos, new System.Text.Json.JsonSerializerOptions 
                    { 
                        WriteIndented = true 
                    }),
                    "application/json",
                    $"audit-export-{DateTime.UtcNow:yyyyMMdd}.json");
            }
        });

        return app;
    }
}
