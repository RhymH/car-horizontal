namespace CarHorizontal.Api.Modules.Vehicles.Dtos;

public sealed class VehicleProgramProjectionDto
{
    public Guid VehicleId { get; set; }
    public Guid? VehicleModelId { get; set; }
    public string? VehicleModelDisplayName { get; set; }
    public Guid? ProgramId { get; set; }
    public string? ProgramName { get; set; }
    public IReadOnlyList<VehicleProgramItemProjectionDto> Items { get; set; } = Array.Empty<VehicleProgramItemProjectionDto>();
}

public sealed class VehicleProgramItemProjectionDto
{
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public DateTime? LastDoneAt { get; set; }
    public int? LastDoneKm { get; set; }
    public DateTime? NextDueAt { get; set; }
    public int? NextDueKm { get; set; }
    public string Status { get; set; } = "Future"; // Done|UpcomingSoon|Upcoming|Overdue|Future
    public int? KmRemaining { get; set; }
    public int? DaysRemaining { get; set; }
    public decimal? EstimatedCostMin { get; set; }
    public decimal? EstimatedCostMax { get; set; }
    public bool HasOverride { get; set; }
    public bool Disabled { get; set; }
}
