using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Vehicles;

public class VehicleProgramOverride : OrganizationEntityBase
{
    public Guid VehicleId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public int? OverrideIntervalMonths { get; set; }
    public int? OverrideIntervalKm { get; set; }
    public bool Disabled { get; set; }
    public string? Reason { get; set; }
}
