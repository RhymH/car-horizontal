namespace CarHorizontal.Api.Modules.Catalog.Dtos;

public sealed class VehicleModelDetailDto
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
    public IReadOnlyList<string> Aliases { get; set; } = Array.Empty<string>();
    public IReadOnlyList<MaintenanceProgramDetailDto> Programs { get; set; } = Array.Empty<MaintenanceProgramDetailDto>();
}

public sealed class MaintenanceProgramDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public string Source { get; set; } = string.Empty;
    public IReadOnlyList<MaintenanceProgramItemDto> Items { get; set; } = Array.Empty<MaintenanceProgramItemDto>();
}

public sealed class MaintenanceProgramItemDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? IntervalMonths { get; set; }
    public int? IntervalKm { get; set; }
    public string Trigger { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public decimal? EstimatedCostMin { get; set; }
    public decimal? EstimatedCostMax { get; set; }
}
