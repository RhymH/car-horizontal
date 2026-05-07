namespace CarHorizontal.Api.Modules.Dashboard.Dtos;

public class DashboardOverviewResponseDto
{
    public DashboardKpisDto Kpis { get; set; } = new();
    public List<DashboardUpcomingReminderDto> UpcomingReminders { get; set; } = new();
    public List<DashboardOverdueTimelineEventDto> OverdueTimeline { get; set; } = new();
    public List<DashboardCriticalThisWeekDto> CriticalThisWeek { get; set; } = new();
    public List<DashboardRecentInteractionDto> RecentInteractions { get; set; } = new();
    public List<DashboardChartPointDto> RemindersChartSeries { get; set; } = new();
    public List<DashboardChartPointDto> LoyaltyTrend { get; set; } = new();
    public DashboardMentalLoadDto MentalLoadAvoided { get; set; } = new();
}

public class DashboardKpisDto
{
    public int ActiveCustomers { get; set; }
    public int CustomersAtRisk { get; set; }
    public int TrackedVehicles { get; set; }
    public int RemindersSentLast30Days { get; set; }
    public int PendingReminders { get; set; }
    public double WorkshopReturnRate { get; set; }

    public int? ActiveCustomersTrendPct { get; set; }
    public int? RemindersSentTrendPct { get; set; }
}

public class DashboardUpcomingReminderDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerFullName { get; set; } = string.Empty;
    public Guid? VehicleId { get; set; }
    public string? VehicleLabel { get; set; }
    public string? LicensePlate { get; set; }
    public string Channel { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ItemCode { get; set; }
    public string? Severity { get; set; }
    public Guid? TimelineEventId { get; set; }
    public string? TimelineEventTitle { get; set; }
}

public class DashboardOverdueTimelineEventDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerFullName { get; set; } = string.Empty;
    public Guid VehicleId { get; set; }
    public string? VehicleLabel { get; set; }
    public string? LicensePlate { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public DateTime? DueAt { get; set; }
    public int? DaysOverdue { get; set; }
    public string? ItemCode { get; set; }
    public string? Severity { get; set; }
}

public class DashboardCriticalThisWeekDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerFullName { get; set; } = string.Empty;
    public Guid VehicleId { get; set; }
    public string? VehicleLabel { get; set; }
    public string? LicensePlate { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime? DueAt { get; set; }
    public string? ItemCode { get; set; }
    public string Severity { get; set; } = string.Empty;
    public bool HasActiveReminder { get; set; }
}

public class DashboardRecentInteractionDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerFullName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public string Summary { get; set; } = string.Empty;
}

public class DashboardChartPointDto
{
    public string Label { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public double Value { get; set; }
}

public class DashboardMentalLoadDto
{
    public int AnticipatedThisMonth { get; set; }
    public int AnticipatedLast12Months { get; set; }
}
