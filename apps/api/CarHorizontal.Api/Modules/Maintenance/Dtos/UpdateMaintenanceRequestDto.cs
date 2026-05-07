namespace CarHorizontal.Api.Modules.Maintenance.Dtos;

public class UpdateMaintenanceRequestDto
{
    public DateTime? PerformedAt { get; set; }
    public string? Type { get; set; }
    public string? Description { get; set; }
    public int? MileageAtService { get; set; }
    public decimal? Cost { get; set; }
    public string? MechanicName { get; set; }
    public DateTime? NextDueAt { get; set; }
    public int? NextDueMileage { get; set; }
    public bool ClearNextDueAt { get; set; }
    public bool ClearNextDueMileage { get; set; }
    public string[]? ItemCodes { get; set; }
}
