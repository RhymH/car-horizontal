using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Appointments;

public class Appointment : OrganizationEntityBase
{
    public Guid CustomerId { get; set; }
    public Guid? VehicleId { get; set; }
    public DateTime ScheduledAt { get; set; }
    public int DurationMinutes { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;
    public Guid? CreatedFromReminderId { get; set; }
}
