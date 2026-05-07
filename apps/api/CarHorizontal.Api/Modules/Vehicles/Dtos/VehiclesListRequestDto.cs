namespace CarHorizontal.Api.Modules.Vehicles.Dtos;

public class VehiclesListRequestDto
{
    public string? Search { get; set; }
    public Guid? CustomerId { get; set; }
    public string? EngineType { get; set; }
    public int? YearFrom { get; set; }
    public int? YearTo { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
    public string? SortBy { get; set; } = "licensePlate";
    public string? SortDir { get; set; } = "asc";
}
