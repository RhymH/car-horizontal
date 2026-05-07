namespace CarHorizontal.Api.Modules.Vehicles.Dtos;

public class UpdateVehicleRequestDto
{
    public Guid? CustomerId { get; set; }
    public string? Make { get; set; }
    public string? Model { get; set; }
    public int? Year { get; set; }
    public string? Vin { get; set; }
    public string? LicensePlate { get; set; }
    public string? EngineType { get; set; }
    public string? TransmissionType { get; set; }
    public DateTime? PurchasedAt { get; set; }
    public string? Color { get; set; }
    public Guid? PhotoFileId { get; set; }
    public Guid? VehicleModelId { get; set; }
    public Guid? SelectedProgramId { get; set; }
    public bool ClearVehicleModel { get; set; }
}
