using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Catalog;

public class MaintenanceProgram : EntityBase
{
    public Guid VehicleModelId { get; set; }
    public string Name { get; set; } = "Standard";
    public bool IsDefault { get; set; }
    public MaintenanceProgramSource Source { get; set; } = MaintenanceProgramSource.Curated;
    public string? SourceReference { get; set; }
    public int ValidFromMileage { get; set; }
    public int? ValidToMileage { get; set; }

    public VehicleModel? VehicleModel { get; set; }
    public ICollection<MaintenanceProgramItem> Items { get; set; } = new List<MaintenanceProgramItem>();
}
