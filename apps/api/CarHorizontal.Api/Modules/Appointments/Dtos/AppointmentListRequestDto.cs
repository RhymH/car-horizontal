namespace CarHorizontal.Api.Modules.Appointments.Dtos;

public class AppointmentListRequestDto
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? VehicleId { get; set; }
    public string? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 100;
    public string? SortDir { get; set; } = "asc";
}
