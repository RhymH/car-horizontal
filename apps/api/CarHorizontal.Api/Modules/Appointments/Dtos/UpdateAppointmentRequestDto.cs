namespace CarHorizontal.Api.Modules.Appointments.Dtos;

public class UpdateAppointmentRequestDto
{
    public DateTime? ScheduledAt { get; set; }
    public int? DurationMinutes { get; set; }
    public string? Subject { get; set; }
    public string? Notes { get; set; }
    public Guid? VehicleId { get; set; }
    public bool ClearVehicle { get; set; }
    public string? Status { get; set; }
}
