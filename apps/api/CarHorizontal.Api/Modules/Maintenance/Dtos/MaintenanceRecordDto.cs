namespace CarHorizontal.Api.Modules.Maintenance.Dtos;

public class MaintenanceRecordDto
{
    public Guid Id { get; set; }
    public Guid VehicleId { get; set; }
    public DateTime PerformedAt { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int MileageAtService { get; set; }
    public decimal? Cost { get; set; }
    public string? MechanicName { get; set; }
    public DateTime? NextDueAt { get; set; }
    public int? NextDueMileage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
