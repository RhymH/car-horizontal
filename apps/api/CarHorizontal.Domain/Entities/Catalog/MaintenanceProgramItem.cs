using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Catalog;

public class MaintenanceProgramItem : EntityBase
{
    public Guid ProgramId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? IntervalMonths { get; set; }
    public int? IntervalKm { get; set; }
    public int? FirstOccurrenceMonths { get; set; }
    public int? FirstOccurrenceKm { get; set; }
    public MaintenanceItemTrigger Trigger { get; set; } = MaintenanceItemTrigger.Earliest;
    public MaintenanceItemSeverity Severity { get; set; } = MaintenanceItemSeverity.Recommended;
    public int? EstimatedDurationMinutes { get; set; }
    public decimal? EstimatedCostMin { get; set; }
    public decimal? EstimatedCostMax { get; set; }
    public string[] RequiredParts { get; set; } = Array.Empty<string>();

    public MaintenanceProgram? Program { get; set; }
}
