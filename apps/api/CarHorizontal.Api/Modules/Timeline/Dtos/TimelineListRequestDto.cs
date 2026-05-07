namespace CarHorizontal.Api.Modules.Timeline.Dtos;

public class TimelineListRequestDto
{
    public Guid? VehicleId { get; set; }
    public Guid? CustomerId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? Status { get; set; }
    public string? Kind { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? SortDir { get; set; } = "asc";
}
