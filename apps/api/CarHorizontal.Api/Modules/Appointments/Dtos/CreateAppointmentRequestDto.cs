namespace CarHorizontal.Api.Modules.Appointments.Dtos;

public class CreateAppointmentRequestDto
{
    public Guid CustomerId { get; set; }
    public Guid? VehicleId { get; set; }
    public DateTime ScheduledAt { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public string Subject { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
