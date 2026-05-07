using CarHorizontal.Domain.Entities.Timeline;

namespace CarHorizontal.Infrastructure.Reminders;

/// <summary>
/// Number of days before <see cref="TimelineEvent.DueAt"/> a Reminder should be
/// scheduled. Defaults are organization-agnostic for now; per-organization
/// overrides land with the messaging settings page (T093).
/// </summary>
public static class ReminderLeadTimes
{
    public const int LookaheadDays = 30;

    public static int ForKind(TimelineEventKind kind) => kind switch
    {
        TimelineEventKind.Maintenance => 14,
        TimelineEventKind.TechnicalInspection => 21,
        TimelineEventKind.TireSwap => 14,
        TimelineEventKind.TradeInOpportunity => 21,
        TimelineEventKind.WarrantyExpiry => 30,
        TimelineEventKind.Custom => 7,
        _ => 7
    };
}
