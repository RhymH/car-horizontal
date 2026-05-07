namespace CarHorizontal.Api.Modules.Reminders.Dtos;

public class CreateReminderRequestDto
{
    public Guid CustomerId { get; set; }
    public Guid? VehicleId { get; set; }
    public Guid? TimelineEventId { get; set; }
    public string Channel { get; set; } = "Email";
    public DateTime ScheduledAt { get; set; }
    public Guid? TemplateId { get; set; }
    public string? ResolvedSubject { get; set; }
    public string? ResolvedBody { get; set; }
}
