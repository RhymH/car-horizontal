namespace CarHorizontal.Api.Modules.Appointments.Dtos;

public class AppointmentDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerFullName { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
    public Guid? VehicleId { get; set; }
    public string? VehicleLabel { get; set; }
    public string? LicensePlate { get; set; }
    public DateTime ScheduledAt { get; set; }
    public int DurationMinutes { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? CreatedFromReminderId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
