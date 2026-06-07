namespace CarHorizontal.Domain.Entities.Notifications;

/// <summary>
/// How the notification should be weighted in the inbox. Ordered so that a
/// higher value sorts first.
/// </summary>
public enum NotificationSeverity
{
    /// <summary>Purely informational.</summary>
    Info = 0,

    /// <summary>Revenue / retention opportunity (trade-in, reactivation…).</summary>
    Opportunity = 1,

    /// <summary>Time-sensitive, should be handled soon.</summary>
    Warning = 2,

    /// <summary>Safety/compliance or strongly overdue — handle first.</summary>
    Critical = 3
}
