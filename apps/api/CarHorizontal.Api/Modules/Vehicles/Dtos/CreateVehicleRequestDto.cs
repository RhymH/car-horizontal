namespace CarHorizontal.Api.Modules.Vehicles.Dtos;

public class CreateVehicleRequestDto
{
    public Guid CustomerId { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public string? Vin { get; set; }
    public string LicensePlate { get; set; } = string.Empty;
    public int CurrentMileage { get; set; }
    public string EngineType { get; set; } = "Gasoline";
    public string? TransmissionType { get; set; }
    public DateTime? PurchasedAt { get; set; }
    public string? Color { get; set; }
    public Guid? PhotoFileId { get; set; }
}
