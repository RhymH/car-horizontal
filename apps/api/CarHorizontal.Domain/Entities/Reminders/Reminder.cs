using CarHorizontal.Domain.Common;
using CarHorizontal.Domain.Entities.Messaging;

namespace CarHorizontal.Domain.Entities.Reminders;

public class Reminder : OrganizationEntityBase
{
    public Guid? TimelineEventId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid? VehicleId { get; set; }
    public MessageChannel Channel { get; set; }
    public DateTime ScheduledAt { get; set; }
    public DateTime? SentAt { get; set; }
    public ReminderStatus Status { get; set; } = ReminderStatus.Scheduled;
    public Guid? TemplateId { get; set; }
    public string? ResolvedSubject { get; set; }
    public string? ResolvedBody { get; set; }
    public string? FailureReason { get; set; }
}
