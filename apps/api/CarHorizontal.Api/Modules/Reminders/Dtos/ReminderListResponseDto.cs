namespace CarHorizontal.Api.Modules.Reminders.Dtos;

public class ReminderListResponseDto
{
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public IReadOnlyList<ReminderDto> Items { get; set; } = Array.Empty<ReminderDto>();
}
