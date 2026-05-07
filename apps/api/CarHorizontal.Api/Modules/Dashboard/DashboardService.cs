using System.Globalization;
using CarHorizontal.Api.Modules.Dashboard.Dtos;
using CarHorizontal.Api.Modules.Loyalty;
using CarHorizontal.Domain.Entities.Customers;
using CarHorizontal.Domain.Entities.Reminders;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Dashboard;

public class DashboardService : IDashboardService
{
    private const int InactivityThresholdDays = 180;

    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly ILoyaltyMetricsService _loyalty;

    public DashboardService(AppDbContext db, ICurrentUserService currentUser, ILoyaltyMetricsService loyalty)
    {
        _db = db;
        _currentUser = currentUser;
        _loyalty = loyalty;
    }

    public async Task<DashboardOverviewResponseDto> GetOverviewAsync(CancellationToken ct = default)
    {
        _ = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");

        var now = DateTime.UtcNow;
        var startOfToday = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);
        var thirtyDaysAgo = startOfToday.AddDays(-29);
        var sixtyDaysAgo = startOfToday.AddDays(-59);
        var oneYearAgo = startOfToday.AddDays(-365);
        var staleSince = startOfToday.AddDays(-InactivityThresholdDays);
        var weekAhead = startOfToday.AddDays(7);
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var kpis = await ComputeKpisAsync(now, startOfToday, thirtyDaysAgo, sixtyDaysAgo, oneYearAgo, staleSince, ct);

        var upcomingReminders = await _db.Reminders.AsNoTracking()
            .Where(r => r.Status == ReminderStatus.Scheduled || r.Status == ReminderStatus.Snoozed)
            .Where(r => r.ScheduledAt >= now)
            .OrderBy(r => r.ScheduledAt)
            .Take(10)
            .Select(r => new
            {
                r.Id,
                r.CustomerId,
                r.VehicleId,
                r.Channel,
                r.ScheduledAt,
                r.Status,
                r.ItemCode,
                r.Severity,
                r.TimelineEventId,
                CustomerFullName = _db.Customers
                    .Where(c => c.Id == r.CustomerId)
                    .Select(c => c.FullName)
                    .FirstOrDefault() ?? string.Empty,
                Vehicle = r.VehicleId == null ? null : _db.Vehicles
                    .Where(v => v.Id == r.VehicleId)
                    .Select(v => new { v.Make, v.Model, v.LicensePlate })
                    .FirstOrDefault(),
                TimelineEventTitle = r.TimelineEventId == null ? null : _db.TimelineEvents
                    .Where(t => t.Id == r.TimelineEventId)
                    .Select(t => t.Title)
                    .FirstOrDefault()
            })
            .ToListAsync(ct);

        var upcomingDtos = upcomingReminders.Select(x => new DashboardUpcomingReminderDto
        {
            Id = x.Id,
            CustomerId = x.CustomerId,
            CustomerFullName = x.CustomerFullName,
            VehicleId = x.VehicleId,
            VehicleLabel = x.Vehicle is null ? null : $"{x.Vehicle.Make} {x.Vehicle.Model}".Trim(),
            LicensePlate = x.Vehicle?.LicensePlate,
            Channel = x.Channel.ToString(),
            ScheduledAt = x.ScheduledAt,
            Status = x.Status.ToString(),
            ItemCode = x.ItemCode,
            Severity = x.Severity?.ToString(),
            TimelineEventId = x.TimelineEventId,
            TimelineEventTitle = x.TimelineEventTitle
        }).ToList();

        var overdueRaw = await _db.TimelineEvents.AsNoTracking()
            .Where(t => t.Status == TimelineEventStatus.Pending || t.Status == TimelineEventStatus.Triggered)
            .Where(t => t.DueAt != null && t.DueAt < startOfToday)
            .OrderBy(t => t.DueAt)
            .Take(10)
            .Select(t => new
            {
                t.Id,
                t.CustomerId,
                t.VehicleId,
                t.Title,
                t.Kind,
                t.DueAt,
                t.ItemCode,
                t.Severity,
                CustomerFullName = _db.Customers
                    .Where(c => c.Id == t.CustomerId)
                    .Select(c => c.FullName)
                    .FirstOrDefault() ?? string.Empty,
                Vehicle = _db.Vehicles
                    .Where(v => v.Id == t.VehicleId)
                    .Select(v => new { v.Make, v.Model, v.LicensePlate })
                    .FirstOrDefault()
            })
            .ToListAsync(ct);

        var overdueDtos = overdueRaw.Select(x => new DashboardOverdueTimelineEventDto
        {
            Id = x.Id,
            CustomerId = x.CustomerId,
            CustomerFullName = x.CustomerFullName,
            VehicleId = x.VehicleId,
            VehicleLabel = x.Vehicle is null ? null : $"{x.Vehicle.Make} {x.Vehicle.Model}".Trim(),
            LicensePlate = x.Vehicle?.LicensePlate,
            Title = x.Title,
            Kind = x.Kind.ToString(),
            DueAt = x.DueAt,
            DaysOverdue = x.DueAt.HasValue ? (int)Math.Ceiling((startOfToday - x.DueAt.Value).TotalDays) : null,
            ItemCode = x.ItemCode,
            Severity = x.Severity?.ToString()
        }).ToList();

        var criticalRaw = await _db.TimelineEvents.AsNoTracking()
            .Where(t => t.Status == TimelineEventStatus.Pending || t.Status == TimelineEventStatus.Triggered)
            .Where(t => t.Severity == Domain.Entities.Catalog.MaintenanceItemSeverity.Critical)
            .Where(t => t.DueAt != null && t.DueAt >= startOfToday && t.DueAt <= weekAhead)
            .OrderBy(t => t.DueAt)
            .Take(15)
            .Select(t => new
            {
                t.Id,
                t.CustomerId,
                t.VehicleId,
                t.Title,
                t.DueAt,
                t.ItemCode,
                t.Severity,
                CustomerFullName = _db.Customers
                    .Where(c => c.Id == t.CustomerId)
                    .Select(c => c.FullName)
                    .FirstOrDefault() ?? string.Empty,
                Vehicle = _db.Vehicles
                    .Where(v => v.Id == t.VehicleId)
                    .Select(v => new { v.Make, v.Model, v.LicensePlate })
                    .FirstOrDefault(),
                HasActiveReminder = _db.Reminders.Any(r => r.TimelineEventId == t.Id
                    && (r.Status == ReminderStatus.Scheduled || r.Status == ReminderStatus.Snoozed))
            })
            .ToListAsync(ct);

        var criticalDtos = criticalRaw.Select(x => new DashboardCriticalThisWeekDto
        {
            Id = x.Id,
            CustomerId = x.CustomerId,
            CustomerFullName = x.CustomerFullName,
            VehicleId = x.VehicleId,
            VehicleLabel = x.Vehicle is null ? null : $"{x.Vehicle.Make} {x.Vehicle.Model}".Trim(),
            LicensePlate = x.Vehicle?.LicensePlate,
            Title = x.Title,
            DueAt = x.DueAt,
            ItemCode = x.ItemCode,
            Severity = x.Severity?.ToString() ?? string.Empty,
            HasActiveReminder = x.HasActiveReminder
        }).ToList();

        var recentRaw = await _db.CustomerInteractions.AsNoTracking()
            .OrderByDescending(i => i.OccurredAt)
            .Take(10)
            .Select(i => new
            {
                i.Id,
                i.CustomerId,
                i.Type,
                i.OccurredAt,
                i.Summary,
                CustomerFullName = _db.Customers
                    .Where(c => c.Id == i.CustomerId)
                    .Select(c => c.FullName)
                    .FirstOrDefault() ?? string.Empty
            })
            .ToListAsync(ct);

        var recentDtos = recentRaw.Select(x => new DashboardRecentInteractionDto
        {
            Id = x.Id,
            CustomerId = x.CustomerId,
            CustomerFullName = x.CustomerFullName,
            Type = x.Type.ToString(),
            OccurredAt = x.OccurredAt,
            Summary = x.Summary
        }).ToList();

        var remindersChart = await BuildRemindersChartAsync(thirtyDaysAgo, startOfToday, ct);
        var loyaltyTrendPoints = await _loyalty.GetRetentionTrendAsync(ct);
        var loyaltyTrend = loyaltyTrendPoints.Select(p => new DashboardChartPointDto
        {
            Date = p.Date,
            Label = p.Label,
            Value = p.Value
        }).ToList();

        var anticipatedThisMonth = await _db.TimelineEvents.AsNoTracking()
            .Where(t => t.Source == TimelineEventSource.AutoGenerated)
            .Where(t => t.CreatedAt >= startOfMonth)
            .CountAsync(ct);
        var anticipatedYear = await _db.TimelineEvents.AsNoTracking()
            .Where(t => t.Source == TimelineEventSource.AutoGenerated)
            .Where(t => t.CreatedAt >= oneYearAgo)
            .CountAsync(ct);

        return new DashboardOverviewResponseDto
        {
            Kpis = kpis,
            UpcomingReminders = upcomingDtos,
            OverdueTimeline = overdueDtos,
            CriticalThisWeek = criticalDtos,
            RecentInteractions = recentDtos,
            RemindersChartSeries = remindersChart,
            LoyaltyTrend = loyaltyTrend,
            MentalLoadAvoided = new DashboardMentalLoadDto
            {
                AnticipatedThisMonth = anticipatedThisMonth,
                AnticipatedLast12Months = anticipatedYear
            }
        };
    }

    private async Task<DashboardKpisDto> ComputeKpisAsync(
        DateTime now,
        DateTime startOfToday,
        DateTime thirtyDaysAgo,
        DateTime sixtyDaysAgo,
        DateTime oneYearAgo,
        DateTime staleSince,
        CancellationToken ct)
    {
        var activeCustomers = await _db.Customers.AsNoTracking()
            .CountAsync(c => c.Status == CustomerStatus.Active, ct);

        var loyaltyOverview = await _loyalty.GetOverviewAsync(ct);
        var atRisk = loyaltyOverview.Kpis.AtRiskCount;

        var trackedVehicles = await _db.Vehicles.AsNoTracking().CountAsync(ct);

        var sentLast30 = await _db.Reminders.AsNoTracking()
            .CountAsync(r => r.Status == ReminderStatus.Sent
                && r.SentAt != null && r.SentAt >= thirtyDaysAgo, ct);

        var sentPrev30 = await _db.Reminders.AsNoTracking()
            .CountAsync(r => r.Status == ReminderStatus.Sent
                && r.SentAt != null && r.SentAt >= sixtyDaysAgo && r.SentAt < thirtyDaysAgo, ct);

        var pendingReminders = await _db.Reminders.AsNoTracking()
            .CountAsync(r => r.Status == ReminderStatus.Scheduled || r.Status == ReminderStatus.Snoozed, ct);

        var customersWithVehicles = await _db.Customers.AsNoTracking()
            .Where(c => _db.Vehicles.Any(v => v.CustomerId == c.Id))
            .Select(c => c.Id)
            .ToListAsync(ct);

        var customersWithService = await _db.MaintenanceRecords.AsNoTracking()
            .Where(m => m.PerformedAt >= oneYearAgo)
            .Select(m => _db.Vehicles
                .Where(v => v.Id == m.VehicleId)
                .Select(v => v.CustomerId)
                .FirstOrDefault())
            .Where(id => id != Guid.Empty)
            .Distinct()
            .CountAsync(ct);

        var workshopReturnRate = customersWithVehicles.Count == 0
            ? 0
            : Math.Round(100.0 * customersWithService / customersWithVehicles.Count, 1);

        return new DashboardKpisDto
        {
            ActiveCustomers = activeCustomers,
            CustomersAtRisk = atRisk,
            TrackedVehicles = trackedVehicles,
            RemindersSentLast30Days = sentLast30,
            PendingReminders = pendingReminders,
            WorkshopReturnRate = workshopReturnRate,
            ActiveCustomersTrendPct = null,
            RemindersSentTrendPct = ComputeTrendPct(sentPrev30, sentLast30)
        };
    }

    private static int? ComputeTrendPct(int previous, int current)
    {
        if (previous <= 0) return current > 0 ? 100 : (int?)null;
        return (int)Math.Round(100.0 * (current - previous) / previous);
    }

    private async Task<List<DashboardChartPointDto>> BuildRemindersChartAsync(
        DateTime fromInclusive,
        DateTime startOfToday,
        CancellationToken ct)
    {
        var to = startOfToday.AddDays(1);

        var sent = await _db.Reminders.AsNoTracking()
            .Where(r => r.Status == ReminderStatus.Sent && r.SentAt != null && r.SentAt >= fromInclusive && r.SentAt < to)
            .Select(r => r.SentAt!.Value.Date)
            .ToListAsync(ct);

        var grouped = sent
            .GroupBy(d => d.Date)
            .ToDictionary(g => g.Key, g => g.Count());

        var points = new List<DashboardChartPointDto>(30);
        for (var i = 0; i < 30; i++)
        {
            var d = fromInclusive.AddDays(i);
            var key = DateTime.SpecifyKind(d.Date, DateTimeKind.Utc);
            grouped.TryGetValue(d.Date, out var count);
            points.Add(new DashboardChartPointDto
            {
                Date = key,
                Label = d.ToString("dd/MM", CultureInfo.InvariantCulture),
                Value = count
            });
        }
        return points;
    }

}
