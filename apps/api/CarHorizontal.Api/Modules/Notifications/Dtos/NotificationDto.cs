namespace CarHorizontal.Api.Modules.Notifications.Dtos;

public class NotificationDto
{
    public Guid Id { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;

    public Guid CustomerId { get; set; }
    public string CustomerFullName { get; set; } = string.Empty;
    public Guid? VehicleId { get; set; }
    public string? VehicleLabel { get; set; }
    public string? LicensePlate { get; set; }
    public Guid? TimelineEventId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime? DueAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
