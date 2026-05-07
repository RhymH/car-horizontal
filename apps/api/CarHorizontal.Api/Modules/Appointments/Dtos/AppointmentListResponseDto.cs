namespace CarHorizontal.Api.Modules.Appointments.Dtos;

public class AppointmentListResponseDto
{
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public List<AppointmentDto> Items { get; set; } = new();
}
