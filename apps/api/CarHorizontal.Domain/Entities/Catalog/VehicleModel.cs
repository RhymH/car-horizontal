using CarHorizontal.Domain.Common;
using CarHorizontal.Domain.Entities.Vehicles;

namespace CarHorizontal.Domain.Entities.Catalog;

public class VehicleModel : EntityBase
{
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? Trim { get; set; }
    public string? EngineCode { get; set; }
    public string EngineDisplayName { get; set; } = string.Empty;
    public EngineType EngineType { get; set; }
    public string FuelType { get; set; } = string.Empty;
    public int ProductionStartYear { get; set; }
    public int? ProductionEndYear { get; set; }
    public VehicleModelMarketRegion MarketRegion { get; set; } = VehicleModelMarketRegion.FR;
    public string Slug { get; set; } = string.Empty;
    public string[] Aliases { get; set; } = Array.Empty<string>();

    public ICollection<MaintenanceProgram> Programs { get; set; } = new List<MaintenanceProgram>();

    public string DisplayName =>
        string.IsNullOrWhiteSpace(Trim)
            ? $"{Make} {Model} {EngineDisplayName}".Trim()
            : $"{Make} {Model} {Trim}".Trim();
}
