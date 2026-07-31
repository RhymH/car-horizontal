namespace CarHorizontal.Api.Modules.Vehicles.Dtos;

public class VehiclesListResponseDto
{
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public IReadOnlyList<VehicleListItemDto> Items { get; set; } = Array.Empty<VehicleListItemDto>();
}

public class VehicleListItemDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerFullName { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int? Year { get; set; }
    public string? LicensePlate { get; set; }
    public int CurrentMileage { get; set; }
    public DateTime MileageUpdatedAt { get; set; }
    public string? EngineType { get; set; }
    public Guid? PhotoFileId { get; set; }

    /// <summary>Statut du dossier de vente, null quand le véhicule n'est pas commercialisé.</summary>
    public string? SaleStatus { get; set; }

    /// <summary>Prix affiché du dossier de vente, le cas échéant.</summary>
    public decimal? AskingPrice { get; set; }
}
