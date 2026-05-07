using CarHorizontal.Domain.Entities.Catalog;
using CarHorizontal.Domain.Entities.Maintenance;
using CarHorizontal.Domain.Entities.Vehicles;
using CarHorizontal.Domain.Vehicles;

namespace CarHorizontal.Domain.Timeline.Rules;

public sealed record RuleContext(
    Vehicle Vehicle,
    IReadOnlyList<MaintenanceRecord> MaintenanceRecords,
    DateTime Now,
    VehicleModel? VehicleModel = null,
    MaintenanceProgram? Program = null,
    IReadOnlyList<VehicleProgramOverride>? Overrides = null,
    MileageEstimate? CurrentMileageEstimate = null);
