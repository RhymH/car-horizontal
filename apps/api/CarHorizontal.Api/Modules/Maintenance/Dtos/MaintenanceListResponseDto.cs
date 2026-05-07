namespace CarHorizontal.Api.Modules.Maintenance.Dtos;

public class MaintenanceListResponseDto
{
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public IReadOnlyList<MaintenanceRecordDto> Items { get; set; } = Array.Empty<MaintenanceRecordDto>();
}
