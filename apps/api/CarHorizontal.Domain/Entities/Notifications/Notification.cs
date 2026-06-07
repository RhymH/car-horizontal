using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Notifications;

/// <summary>
/// A contextual, actionable item raised for the garage's staff — the unit of the
/// collaborator notification center. Generated from timeline signals and CRM
/// heuristics (e.g. inactivity), never edited by hand.
/// </summary>
public class Notification : OrganizationEntityBase
{
    public NotificationKind Kind { get; set; }
    public NotificationSeverity Severity { get; set; } = NotificationSeverity.Info;
    public NotificationStatus Status { get; set; } = NotificationStatus.New;

    public Guid CustomerId { get; set; }
    public Guid? VehicleId { get; set; }

    /// <summary>Source timeline event, when the notification was derived from one.</summary>
    public Guid? TimelineEventId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    /// <summary>Suggested 1-click next step for the collaborator.</summary>
    public NotificationAction Action { get; set; } = NotificationAction.ViewCustomer;

    /// <summary>When the underlying obligation is due (drives sorting/urgency).</summary>
    public DateTime? DueAt { get; set; }

    /// <summary>
    /// Stable idempotency key (e.g. "timeline:{eventId}" or "inactive:{customerId}").
    /// The generator skips creating a new notification while an open one with the
    /// same key already exists.
    /// </summary>
    public string DedupKey { get; set; } = string.Empty;

    public DateTime? ReadAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
