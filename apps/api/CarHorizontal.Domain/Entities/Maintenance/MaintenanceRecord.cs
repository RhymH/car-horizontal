using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Maintenance;

public class MaintenanceRecord : OrganizationEntityBase
{
    public Guid VehicleId { get; set; }
    public DateTime PerformedAt { get; set; }
    public int MileageAtService { get; set; }
    public MaintenanceType Type { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal? Cost { get; set; }
    public DateTime? NextDueAt { get; set; }
    public int? NextDueMileage { get; set; }
    public string? MechanicName { get; set; }
}
