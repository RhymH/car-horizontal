namespace CarHorizontal.Api.Modules.Reminders.Dtos;

public class ReminderDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerFullName { get; set; } = string.Empty;
    public Guid? VehicleId { get; set; }
    public string? VehicleLabel { get; set; }
    public string? LicensePlate { get; set; }
    public Guid? TimelineEventId { get; set; }
    public string? TimelineEventTitle { get; set; }
    public string Channel { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }
    public DateTime? SentAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? TemplateId { get; set; }
    public string? ResolvedSubject { get; set; }
    public string? ResolvedBody { get; set; }
    public string? FailureReason { get; set; }
    public string? ItemCode { get; set; }
    public string? Severity { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
