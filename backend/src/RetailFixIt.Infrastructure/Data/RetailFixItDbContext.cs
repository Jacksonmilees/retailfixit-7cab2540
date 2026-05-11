using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RetailFixIt.Domain.Entities;

namespace RetailFixIt.Infrastructure.Data;

public class RetailFixItDbContext : DbContext
{
    public RetailFixItDbContext(DbContextOptions<RetailFixItDbContext> options) : base(options)
    {
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<AIRecommendation> AIRecommendations => Set<AIRecommendation>();
    public DbSet<FeatureFlag> FeatureFlags => Set<FeatureFlag>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<AIGovernance> AIGovernance => Set<AIGovernance>();
    public DbSet<AIPromptVersion> AIPromptVersions => Set<AIPromptVersion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Tenant configuration
        modelBuilder.Entity<Tenant>(e =>
        {
            e.ToTable("Tenants");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(120).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(60).IsRequired();
            e.HasIndex(x => x.Slug).IsUnique();
        });

        // User configuration
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("Users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).HasMaxLength(255).IsRequired();
            e.Property(x => x.Name).HasMaxLength(120).IsRequired();
            e.Property(x => x.RolesJson).HasMaxLength(400).IsRequired();
            e.HasIndex(x => new { x.TenantId, x.Email }).IsUnique();
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
        });

        // Vendor configuration
        modelBuilder.Entity<Vendor>(e =>
        {
            e.ToTable("Vendors");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(160).IsRequired();
            e.Property(x => x.Email).HasMaxLength(255);
            e.Property(x => x.Phone).HasMaxLength(40);
            e.Property(x => x.CategoriesJson).HasMaxLength(400);
            e.Property(x => x.RegionsJson).HasMaxLength(400);
            e.Property(x => x.Status).HasMaxLength(16).IsRequired();
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
        });

        // Job configuration
        modelBuilder.Entity<Job>(e =>
        {
            e.ToTable("Jobs");
            e.HasKey(x => x.Id);
            e.Property(x => x.Reference).HasMaxLength(20).IsRequired();
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.CustomerName).HasMaxLength(160);
            e.Property(x => x.CustomerPhone).HasMaxLength(40);
            e.Property(x => x.Address).HasMaxLength(240);
            e.Property(x => x.City).HasMaxLength(80);
            e.Property(x => x.Region).HasMaxLength(40);
            e.Property(x => x.Category).HasMaxLength(40);
            e.Property(x => x.Status).HasMaxLength(16);
            e.Property(x => x.Priority).HasMaxLength(8);
            e.Property(x => x.EscalationRisk).HasMaxLength(8);
            e.Property(x => x.RowVersion).IsRowVersion();
            e.HasIndex(x => new { x.TenantId, x.Status, x.CreatedAt });
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.AssignedVendor).WithMany().HasForeignKey(x => x.AssignedVendorId);
        });

        // Assignment configuration
        modelBuilder.Entity<Assignment>(e =>
        {
            e.ToTable("Assignments");
            e.HasKey(x => x.Id);
            e.Property(x => x.AssignedBy).HasMaxLength(60).IsRequired();
            e.Property(x => x.Status).HasMaxLength(16).IsRequired();
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Job).WithMany(x => x.Assignments).HasForeignKey(x => x.JobId);
            e.HasOne(x => x.Vendor).WithMany().HasForeignKey(x => x.VendorId);
        });

        // AIRecommendation configuration
        modelBuilder.Entity<AIRecommendation>(e =>
        {
            e.ToTable("AIRecommendations");
            e.HasKey(x => x.Id);
            e.Property(x => x.ModelVersion).HasMaxLength(60);
            e.Property(x => x.PromptVersion).HasMaxLength(20);
            e.Property(x => x.Status).HasMaxLength(12);
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Job).WithMany(x => x.AIRecommendations).HasForeignKey(x => x.JobId);
        });

        // FeatureFlag configuration
        modelBuilder.Entity<FeatureFlag>(e =>
        {
            e.ToTable("FeatureFlags");
            e.HasKey(x => new { x.TenantId, x.Key });
            e.Property(x => x.Key).HasMaxLength(60);
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
        });

        // OutboxMessage configuration
        modelBuilder.Entity<OutboxMessage>(e =>
        {
            e.ToTable("OutboxMessages");
            e.HasKey(x => x.Id);
            e.Property(x => x.Type).HasMaxLength(60).IsRequired();
            e.Property(x => x.CorrelationId).HasMaxLength(60).IsRequired();
            e.HasIndex(x => x.ProcessedAt).HasFilter("[ProcessedAt] IS NULL");
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
        });

        // AIGovernance configuration
        modelBuilder.Entity<AIGovernance>(e =>
        {
            e.ToTable("AIGovernance");
            e.HasKey(x => x.Id);
            e.Property(x => x.PinnedModelVersion).HasMaxLength(60);
            e.Property(x => x.PinnedPromptVersion).HasMaxLength(20);
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
        });

        // AIPromptVersion configuration
        modelBuilder.Entity<AIPromptVersion>(e =>
        {
            e.ToTable("AIPromptVersions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Version).HasMaxLength(20).IsRequired();
            e.Property(x => x.Purpose).HasMaxLength(40).IsRequired();
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
        });
    }
}
