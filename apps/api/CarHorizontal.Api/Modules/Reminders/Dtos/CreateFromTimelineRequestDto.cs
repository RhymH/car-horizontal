namespace CarHorizontal.Api.Modules.Reminders.Dtos;

public class CreateFromTimelineRequestDto
{
    public string? Channel { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public Guid? TemplateId { get; set; }
}
