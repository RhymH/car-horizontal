using CarHorizontal.Domain.Common;
using CarHorizontal.Domain.Vehicles;

namespace CarHorizontal.Domain.Entities.Vehicles;

public class VehicleMileageReading : OrganizationEntityBase
{
    public Guid VehicleId { get; set; }
    public int Mileage { get; set; }
    public DateTime ObservedAt { get; set; } = DateTime.UtcNow;
    public MileageReadingSource Source { get; set; } = MileageReadingSource.Manual;
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    public Guid? RecordedBy { get; set; }
    public string? Notes { get; set; }
}
