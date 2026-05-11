namespace RetailFixIt.Domain.Enums;

public static class JobStatuses
{
    public const string New = "new";
    public const string Triaged = "triaged";
    public const string Assigned = "assigned";
    public const string InProgress = "in_progress";
    public const string OnHold = "on_hold";
    public const string Completed = "completed";
    public const string Cancelled = "cancelled";
}

public static class JobPriorities
{
    public const string Low = "low";
    public const string Normal = "normal";
    public const string High = "high";
    public const string Urgent = "urgent";
}

public static class VendorStatuses
{
    public const string Active = "active";
    public const string Paused = "paused";
    public const string Suspended = "suspended";
}

public static class AssignmentStatuses
{
    public const string Pending = "pending";
    public const string Accepted = "accepted";
    public const string Declined = "declined";
    public const string Completed = "completed";
}

public static class AIRecommendationStatuses
{
    public const string Pending = "pending";
    public const string Ready = "ready";
    public const string Failed = "failed";
}

public static class Roles
{
    public const string Admin = "admin";
    public const string Dispatcher = "dispatcher";
    public const string VendorManager = "vendor_manager";
    public const string Support = "support";
}
