using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Vehicles;

public class Vehicle : OrganizationEntityBase
{
    public Guid CustomerId { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public string? Vin { get; set; }
    public string LicensePlate { get; set; } = string.Empty;
    public int CurrentMileage { get; set; }
    public DateTime MileageUpdatedAt { get; set; } = DateTime.UtcNow;
    public EngineType EngineType { get; set; }
    public string? TransmissionType { get; set; }
    public DateTime? PurchasedAt { get; set; }
    public string? Color { get; set; }
    public Guid? PhotoFileId { get; set; }
}
