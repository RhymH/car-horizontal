namespace CarHorizontal.Api.Modules.Catalog.Dtos;

public sealed class VehicleModelListItemDto
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? Trim { get; set; }
    public string EngineDisplayName { get; set; } = string.Empty;
    public string EngineType { get; set; } = string.Empty;
    public string FuelType { get; set; } = string.Empty;
    public int ProductionStartYear { get; set; }
    public int? ProductionEndYear { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public IReadOnlyList<VehicleModelProgramSummaryDto> Programs { get; set; } = Array.Empty<VehicleModelProgramSummaryDto>();
}

public sealed class VehicleModelProgramSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public int ItemCount { get; set; }
}
