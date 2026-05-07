namespace CarHorizontal.Infrastructure.Reminders;

public interface IAutoReminderScheduler
{
    /// <summary>
    /// Scan every Pending TimelineEvent of every organization whose DueAt falls
    /// inside the lookahead window and create a Scheduled Reminder for it when
    /// none already exists. Idempotent — safe to run on a daily cron.
    /// </summary>
    Task<int> EnsureRemindersAsync(CancellationToken ct = default);

    /// <summary>
    /// Same as EnsureRemindersAsync but scoped to a single organization. Used
    /// for ad-hoc triggers (admin action, integration tests).
    /// </summary>
    Task<int> EnsureRemindersForOrganizationAsync(Guid organizationId, CancellationToken ct = default);
}
