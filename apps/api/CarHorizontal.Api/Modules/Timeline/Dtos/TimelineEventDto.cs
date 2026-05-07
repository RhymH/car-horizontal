namespace CarHorizontal.Api.Modules.Timeline.Dtos;

public class TimelineEventDto
{
    public Guid Id { get; set; }
    public Guid VehicleId { get; set; }
    public Guid CustomerId { get; set; }
    public string VehicleLabel { get; set; } = string.Empty;
    public string LicensePlate { get; set; } = string.Empty;
    public string CustomerFullName { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? DueAt { get; set; }
    public int? DueMileage { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string? GeneratedFromRule { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
