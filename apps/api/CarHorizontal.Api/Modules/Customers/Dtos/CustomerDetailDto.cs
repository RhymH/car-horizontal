namespace CarHorizontal.Api.Modules.Customers.Dtos;

public class CustomerDetailDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Notes { get; set; }
    public DateTime AcquiredAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string[] Tags { get; set; } = Array.Empty<string>();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public IReadOnlyList<CustomerVehicleDto> Vehicles { get; set; } = Array.Empty<CustomerVehicleDto>();
    public IReadOnlyList<CustomerInteractionDto> RecentInteractions { get; set; } = Array.Empty<CustomerInteractionDto>();
}

public class CustomerVehicleDto
{
    public Guid Id { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public string LicensePlate { get; set; } = string.Empty;
    public int CurrentMileage { get; set; }
    public string EngineType { get; set; } = string.Empty;
    public Guid? PhotoFileId { get; set; }
}
