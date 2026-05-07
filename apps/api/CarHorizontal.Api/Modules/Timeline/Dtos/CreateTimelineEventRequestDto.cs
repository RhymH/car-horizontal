namespace CarHorizontal.Api.Modules.Timeline.Dtos;

public class CreateTimelineEventRequestDto
{
    public Guid VehicleId { get; set; }
    public string Kind { get; set; } = "Custom";
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? DueAt { get; set; }
    public int? DueMileage { get; set; }
}
