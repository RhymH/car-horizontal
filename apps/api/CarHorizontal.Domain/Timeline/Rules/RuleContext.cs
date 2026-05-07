using CarHorizontal.Domain.Entities.Maintenance;
using CarHorizontal.Domain.Entities.Vehicles;

namespace CarHorizontal.Domain.Timeline.Rules;

public sealed record RuleContext(
    Vehicle Vehicle,
    IReadOnlyList<MaintenanceRecord> MaintenanceRecords,
    DateTime Now);
