namespace CarHorizontal.Domain.Entities.Notifications;

public enum NotificationStatus
{
    /// <summary>Just raised, not seen yet — counts toward the unread badge.</summary>
    New = 0,

    /// <summary>Seen by a collaborator but no action taken yet.</summary>
    Read = 1,

    /// <summary>Acted upon (appointment booked, reminder sent, customer called…).</summary>
    Done = 2,

    /// <summary>Explicitly dismissed as not relevant.</summary>
    Dismissed = 3
}
