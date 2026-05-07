using CarHorizontal.Domain.Entities.Catalog;
using CarHorizontal.Domain.Entities.Timeline;

namespace CarHorizontal.Infrastructure.Reminders;

public static class ReminderLeadTimes
{
    public const int LookaheadDays = 30;

    public static int ForEvent(TimelineEvent ev)
    {
        // Critical safety items get a longer lead time (21j) so the customer
        // has time to schedule the work.
        if (ev.Severity == MaintenanceItemSeverity.Critical) return 21;
        return ForKind(ev.Kind);
    }

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
