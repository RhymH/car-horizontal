using CarHorizontal.Domain.Entities.Vehicles;

namespace CarHorizontal.Api.Modules.Vehicles.Validators;

internal static class VehicleValidationRules
{
    public static int MinYear => 1950;
    public static int MaxYear => DateTime.UtcNow.Year + 1;

    public static bool IsValidEngineType(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return false;
        return Enum.TryParse<EngineType>(raw, ignoreCase: true, out _);
    }
}
