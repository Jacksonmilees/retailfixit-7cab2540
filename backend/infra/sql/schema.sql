-- RetailFixIt Database Schema with Row-Level Security
-- Run this script to initialize the Azure SQL database

-- Create schema for RLS
CREATE SCHEMA rls;
GO

-- =============================================
-- TABLES
-- =============================================

CREATE TABLE Tenants(
    Id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
    Name nvarchar(120) NOT NULL,
    Slug nvarchar(60) UNIQUE NOT NULL,
    CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE Users(
    Id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
    TenantId uniqueidentifier NOT NULL REFERENCES Tenants(Id),
    Email nvarchar(255) NOT NULL,
    Name nvarchar(120) NOT NULL,
    RolesJson nvarchar(400) NOT NULL DEFAULT '[]',
    EntraObjectId uniqueidentifier NULL,
    CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Users_Tenant_Email UNIQUE (TenantId, Email)
);
GO

CREATE TABLE Vendors(
    Id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
    TenantId uniqueidentifier NOT NULL,
    Name nvarchar(160) NOT NULL,
    Email nvarchar(255),
    Phone nvarchar(40),
    CategoriesJson nvarchar(400),
    RegionsJson nvarchar(400),
    Rating decimal(3,2),
    CompletedJobs int,
    ActiveJobs int,
    Capacity int,
    Status varchar(16) NOT NULL DEFAULT 'active',
    AvgResponseMinutes int,
    LastActiveAt datetime2,
    EmbeddingId uniqueidentifier NULL
);
GO

CREATE TABLE Jobs(
    Id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
    TenantId uniqueidentifier NOT NULL,
    Reference nvarchar(20) NOT NULL,
    Title nvarchar(200) NOT NULL,
    Description nvarchar(max),
    CustomerName nvarchar(160),
    CustomerPhone nvarchar(40),
    Address nvarchar(240),
    City nvarchar(80),
    Region nvarchar(40),
    Category nvarchar(40),
    Status varchar(16) DEFAULT 'new',
    Priority varchar(8) DEFAULT 'normal',
    SlaDueAt datetime2,
    CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt datetime2,
    AssignedVendorId uniqueidentifier NULL REFERENCES Vendors(Id),
    AssignedAt datetime2 NULL,
    EstimatedValue decimal(10,2),
    ComplexityScore tinyint,
    EscalationRisk varchar(8),
    AiSummary nvarchar(max),
    RowVersion rowversion,
    INDEX IX_Jobs_TenantStatus (TenantId, Status, CreatedAt DESC)
);
GO

CREATE TABLE Assignments(
    Id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
    TenantId uniqueidentifier NOT NULL,
    JobId uniqueidentifier NOT NULL REFERENCES Jobs(Id),
    VendorId uniqueidentifier NOT NULL REFERENCES Vendors(Id),
    AssignedBy nvarchar(60) NOT NULL,
    AssignedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    AcceptedAt datetime2 NULL,
    CompletedAt datetime2 NULL,
    Status varchar(16) NOT NULL DEFAULT 'pending',
    Notes nvarchar(max)
);
GO

CREATE TABLE AIRecommendations(
    Id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
    TenantId uniqueidentifier NOT NULL,
    JobId uniqueidentifier NOT NULL,
    CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ModelVersion nvarchar(60),
    PromptVersion nvarchar(20),
    LatencyMs int,
    Confidence decimal(4,3),
    FallbackUsed bit DEFAULT 0,
    Status varchar(12) DEFAULT 'pending',
    CandidatesJson nvarchar(max),
    AcceptedVendorId uniqueidentifier NULL,
    OverrideReason nvarchar(400),
    PromptTokens int,
    CompletionTokens int,
    CostUsd decimal(8,4)
);
GO

CREATE TABLE FeatureFlags(
    TenantId uniqueidentifier NOT NULL REFERENCES Tenants(Id),
    [Key] varchar(60) NOT NULL,
    Enabled bit NOT NULL DEFAULT 0,
    RolloutPercent tinyint NOT NULL DEFAULT 0,
    AllowlistJson nvarchar(max),
    PRIMARY KEY (TenantId, [Key])
);
GO

CREATE TABLE OutboxMessages(
    Id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
    TenantId uniqueidentifier NOT NULL,
    Type varchar(60) NOT NULL,
    PayloadJson nvarchar(max) NOT NULL,
    CorrelationId varchar(60) NOT NULL,
    CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ProcessedAt datetime2 NULL,
    Attempts int NOT NULL DEFAULT 0,
    INDEX IX_Outbox_Pending (ProcessedAt) WHERE ProcessedAt IS NULL
);
GO

CREATE TABLE AIGovernance(
    Id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
    TenantId uniqueidentifier NOT NULL REFERENCES Tenants(Id),
    Enabled bit NOT NULL DEFAULT 1,
    PinnedModelVersion nvarchar(60),
    PinnedPromptVersion nvarchar(20),
    Temperature float NOT NULL DEFAULT 0.2,
    TopP float NOT NULL DEFAULT 0.9,
    ConfidenceFloor decimal(4,3) DEFAULT 0.6,
    MaxTokensPerRecommendation int DEFAULT 600,
    DailyBudgetUsd decimal(8,2) DEFAULT 100.00,
    PiiRedactionRequired bit NOT NULL DEFAULT 1,
    UpdatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE AIPromptVersions(
    Id uniqueidentifier PRIMARY KEY DEFAULT NEWID(),
    TenantId uniqueidentifier NOT NULL,
    Version nvarchar(20) NOT NULL,
    Purpose nvarchar(40) NOT NULL,
    SystemPrompt nvarchar(max) NOT NULL,
    ToolSchemaJson nvarchar(max),
    IsActive bit NOT NULL DEFAULT 0,
    CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ActivatedAt datetime2 NULL
);
GO

-- =============================================
-- ROW-LEVEL SECURITY (RLS)
-- =============================================

-- Security predicate function
CREATE FUNCTION rls.fn_tenant(@TenantId uniqueidentifier)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN SELECT 1 AS fn_tenant_filter_result
WHERE @TenantId = CAST(SESSION_CONTEXT(N'TenantId') AS uniqueidentifier)
   OR CAST(SESSION_CONTEXT(N'TenantId') AS nvarchar(128)) = 'admin';
GO

-- Create security policies
CREATE SECURITY POLICY rls.UsersPolicy
    ADD FILTER PREDICATE rls.fn_tenant(TenantId) ON dbo.Users,
    ADD BLOCK PREDICATE rls.fn_tenant(TenantId) ON dbo.Users AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenant(TenantId) ON dbo.Users AFTER UPDATE
WITH (STATE = ON, SCHEMABINDING = ON);
GO

CREATE SECURITY POLICY rls.VendorsPolicy
    ADD FILTER PREDICATE rls.fn_tenant(TenantId) ON dbo.Vendors,
    ADD BLOCK PREDICATE rls.fn_tenant(TenantId) ON dbo.Vendors AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenant(TenantId) ON dbo.Vendors AFTER UPDATE
WITH (STATE = ON, SCHEMABINDING = ON);
GO

CREATE SECURITY POLICY rls.JobsPolicy
    ADD FILTER PREDICATE rls.fn_tenant(TenantId) ON dbo.Jobs,
    ADD BLOCK PREDICATE rls.fn_tenant(TenantId) ON dbo.Jobs AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenant(TenantId) ON dbo.Jobs AFTER UPDATE
WITH (STATE = ON, SCHEMABINDING = ON);
GO

CREATE SECURITY POLICY rls.AssignmentsPolicy
    ADD FILTER PREDICATE rls.fn_tenant(TenantId) ON dbo.Assignments,
    ADD BLOCK PREDICATE rls.fn_tenant(TenantId) ON dbo.Assignments AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenant(TenantId) ON dbo.Assignments AFTER UPDATE
WITH (STATE = ON, SCHEMABINDING = ON);
GO

CREATE SECURITY POLICY rls.AIRecommendationsPolicy
    ADD FILTER PREDICATE rls.fn_tenant(TenantId) ON dbo.AIRecommendations,
    ADD BLOCK PREDICATE rls.fn_tenant(TenantId) ON dbo.AIRecommendations AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenant(TenantId) ON dbo.AIRecommendations AFTER UPDATE
WITH (STATE = ON, SCHEMABINDING = ON);
GO

CREATE SECURITY POLICY rls.OutboxPolicy
    ADD FILTER PREDICATE rls.fn_tenant(TenantId) ON dbo.OutboxMessages,
    ADD BLOCK PREDICATE rls.fn_tenant(TenantId) ON dbo.OutboxMessages AFTER INSERT
WITH (STATE = ON, SCHEMABINDING = ON);
GO

-- =============================================
-- SEED DATA
-- =============================================

-- Seed a default tenant
DECLARE @TenantId uniqueidentifier = '00000000-0000-0000-0000-000000000001';

INSERT INTO Tenants (Id, Name, Slug, CreatedAt)
VALUES (@TenantId, 'RetailFixIt', 'retailfixit', SYSUTCDATETIME());

-- Seed default users
INSERT INTO Users (Id, TenantId, Email, Name, RolesJson, CreatedAt)
VALUES
    ('00000000-0000-0000-0000-000000000011', @TenantId, 'alex@retailfixit.com', 'Alex Makori', '["admin","dispatcher"]', SYSUTCDATETIME()),
    ('00000000-0000-0000-0000-000000000012', @TenantId, 'morgan@retailfixit.com', 'Morgan Lee', '["dispatcher"]', SYSUTCDATETIME()),
    ('00000000-0000-0000-0000-000000000013', @TenantId, 'sam@retailfixit.com', 'Sam Patel', '["vendor_manager"]', SYSUTCDATETIME()),
    ('00000000-0000-0000-0000-000000000014', @TenantId, 'jordan@retailfixit.com', 'Jordan Kim', '["support"]', SYSUTCDATETIME());

-- Seed default AI governance
INSERT INTO AIGovernance (Id, TenantId, Enabled, PinnedModelVersion, PinnedPromptVersion, UpdatedAt)
VALUES (NEWID(), @TenantId, 1, 'gpt-4o-2024-11-20', 'v3.2', SYSUTCDATETIME());

-- Seed default prompt version
INSERT INTO AIPromptVersions (Id, TenantId, Version, Purpose, SystemPrompt, IsActive, CreatedAt, ActivatedAt)
VALUES (
    NEWID(),
    @TenantId,
    'v3.2',
    'recommendation',
    'You are RetailFixIt''s dispatch assistant. Given a job and 5 candidate vendors, return a JSON tool call `propose_vendors` with up to 3 ranked candidates and per-candidate reasoning (<=200 chars). Never invent vendors. If confidence < 0.6 for the top pick, set "fallbackToHuman": true.',
    1,
    SYSUTCDATETIME(),
    SYSUTCDATETIME()
);
GO
