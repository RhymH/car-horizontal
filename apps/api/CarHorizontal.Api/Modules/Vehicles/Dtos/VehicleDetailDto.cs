namespace CarHorizontal.Api.Modules.Vehicles.Dtos;

public class VehicleDetailDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerFullName { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public string? Vin { get; set; }
    public string LicensePlate { get; set; } = string.Empty;
    public int CurrentMileage { get; set; }
    public DateTime MileageUpdatedAt { get; set; }
    public string EngineType { get; set; } = string.Empty;
    public string? TransmissionType { get; set; }
    public DateTime? PurchasedAt { get; set; }
    public string? Color { get; set; }
    public Guid? PhotoFileId { get; set; }
    public Guid? VehicleModelId { get; set; }
    public Guid? SelectedProgramId { get; set; }
    public string? VehicleModelDisplayName { get; set; }
    public string? SelectedProgramName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public IReadOnlyList<VehicleMaintenanceDto> MaintenanceRecords { get; set; } = Array.Empty<VehicleMaintenanceDto>();
    public IReadOnlyList<VehicleTimelineEventDto> TimelineEvents { get; set; } = Array.Empty<VehicleTimelineEventDto>();
}

public class VehicleMaintenanceDto
{
    public Guid Id { get; set; }
    public DateTime PerformedAt { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int MileageAtService { get; set; }
    public decimal? Cost { get; set; }
    public string? MechanicName { get; set; }
    public DateTime? NextDueAt { get; set; }
    public int? NextDueMileage { get; set; }
}

public class VehicleTimelineEventDto
{
    public Guid Id { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? DueAt { get; set; }
    public int? DueMileage { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string? GeneratedFromRule { get; set; }
}
