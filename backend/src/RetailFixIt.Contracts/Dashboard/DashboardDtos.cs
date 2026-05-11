namespace RetailFixIt.Contracts.Dashboard;

public class DashboardMetricsDto
{
    public int JobsOpen { get; set; }
    public int JobsAssignedToday { get; set; }
    public int JobsCompletedToday { get; set; }
    public int SlaBreaches { get; set; }
    public int AvgAssignmentMinutes { get; set; }
    public decimal AiOverrideRate { get; set; }
    public int VendorsActive { get; set; }
    public List<StatusCountDto> JobsByStatus { get; set; } = new();
    public List<PriorityCountDto> JobsByPriority { get; set; } = new();
    public List<JobsTrendDto> JobsTrend { get; set; } = new();
}

public class StatusCountDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class PriorityCountDto
{
    public string Priority { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class JobsTrendDto
{
    public string Date { get; set; } = string.Empty;
    public int Created { get; set; }
    public int Completed { get; set; }
}
