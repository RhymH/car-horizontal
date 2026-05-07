using CarHorizontal.Domain.Entities.Maintenance;

namespace CarHorizontal.Api.Modules.Maintenance.Validators;

internal static class MaintenanceValidationRules
{
    public static bool IsValidMaintenanceType(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return false;
        return Enum.TryParse<MaintenanceType>(raw, ignoreCase: true, out _);
    }

    public const string TypeError =
        "Type must be one of: Oil, Tires, Brakes, FullService, TechnicalInspection, Custom.";
}
