namespace CarHorizontal.Api.Modules.Search.Dtos;

public class SearchResultsDto
{
    public IReadOnlyList<SearchCustomerDto> Customers { get; set; } = Array.Empty<SearchCustomerDto>();
    public IReadOnlyList<SearchVehicleDto> Vehicles { get; set; } = Array.Empty<SearchVehicleDto>();
}

public class SearchCustomerDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
}

public class SearchVehicleDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string LicensePlate { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
}
