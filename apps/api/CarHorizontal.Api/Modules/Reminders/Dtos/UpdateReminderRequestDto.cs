namespace CarHorizontal.Api.Modules.Reminders.Dtos;

public class UpdateReminderRequestDto
{
    public string? Channel { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public Guid? TemplateId { get; set; }
    public bool ClearTemplate { get; set; }
    public string? ResolvedSubject { get; set; }
    public string? ResolvedBody { get; set; }
}
