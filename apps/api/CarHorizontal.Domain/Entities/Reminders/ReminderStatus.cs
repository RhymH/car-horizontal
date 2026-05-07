namespace CarHorizontal.Domain.Entities.Reminders;

public enum ReminderStatus
{
    Scheduled = 0,
    Sent = 1,
    Failed = 2,
    Cancelled = 3,
    Snoozed = 4
}
