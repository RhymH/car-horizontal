namespace CarHorizontal.Api.Modules.Reminders.Dtos;

public class ReminderListRequestDto
{
    public string? Status { get; set; }
    public string? Channel { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? VehicleId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? SortDir { get; set; } = "asc";
}
