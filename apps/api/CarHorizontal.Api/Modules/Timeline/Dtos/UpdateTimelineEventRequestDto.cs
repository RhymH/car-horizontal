namespace CarHorizontal.Api.Modules.Timeline.Dtos;

public class UpdateTimelineEventRequestDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public DateTime? DueAt { get; set; }
    public int? DueMileage { get; set; }
    public bool ClearDueAt { get; set; }
    public bool ClearDueMileage { get; set; }
    public string? Kind { get; set; }
}
