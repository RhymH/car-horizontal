namespace CarHorizontal.Infrastructure.Catalog.Seed;

internal sealed class CatalogSeedRoot
{
    public List<CatalogSeedVehicleModel> VehicleModels { get; set; } = new();
}

internal sealed class CatalogSeedVehicleModel
{
    public string Slug { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? Trim { get; set; }
    public string? EngineCode { get; set; }
    public string EngineDisplayName { get; set; } = string.Empty;
    public string EngineType { get; set; } = string.Empty;
    public string FuelType { get; set; } = string.Empty;
    public int ProductionStartYear { get; set; }
    public int? ProductionEndYear { get; set; }
    public string MarketRegion { get; set; } = "FR";
    public List<string> Aliases { get; set; } = new();
    public List<CatalogSeedProgram> Programs { get; set; } = new();
}

internal sealed class CatalogSeedProgram
{
    public string Name { get; set; } = "Standard";
    public bool IsDefault { get; set; }
    public string Source { get; set; } = "Manufacturer";
    public string? SourceReference { get; set; }
    public List<CatalogSeedItem> Items { get; set; } = new();
}

internal sealed class CatalogSeedItem
{
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? IntervalMonths { get; set; }
    public int? IntervalKm { get; set; }
    public int? FirstOccurrenceMonths { get; set; }
    public int? FirstOccurrenceKm { get; set; }
    public string Trigger { get; set; } = "Earliest";
    public string Severity { get; set; } = "Recommended";
    public int? EstimatedDurationMinutes { get; set; }
    public decimal? EstimatedCostMin { get; set; }
    public decimal? EstimatedCostMax { get; set; }
    public List<string>? RequiredParts { get; set; }
}
