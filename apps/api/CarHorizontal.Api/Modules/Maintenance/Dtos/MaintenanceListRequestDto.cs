namespace CarHorizontal.Api.Modules.Maintenance.Dtos;

public class MaintenanceListRequestDto
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
    public string? SortBy { get; set; } = "performedAt";
    public string? SortDir { get; set; } = "desc";
}
