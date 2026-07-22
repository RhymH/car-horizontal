namespace CarHorizontal.Domain.Vehicles;

/// <summary>
/// Outcome of decoding a VIN. A decode is a best-effort *suggestion* used to
/// pre-fill a vehicle form — the user can always override it. Fields are null
/// when they could not be derived.
/// </summary>
public sealed record VinDecodeResult
{
    public required string Vin { get; init; }

    /// <summary>True when the VIN passes structural + check-digit validation.</summary>
    public bool IsValid { get; init; }

    /// <summary>Manufacturer, derived from the World Manufacturer Identifier (first 3 chars).</summary>
    public string? Make { get; init; }

    /// <summary>Country/region of manufacture.</summary>
    public string? Country { get; init; }

    /// <summary>Model year, derived from position 10 (disambiguated with position 7).</summary>
    public int? ModelYear { get; init; }

    /// <summary>World Manufacturer Identifier (first 3 characters).</summary>
    public string? Wmi { get; init; }

    /// <summary>Model name — only an online provider can decode this (VDS is proprietary).</summary>
    public string? Model { get; init; }

    /// <summary>Primary fuel type, verbatim from the provider (e.g. "Gasoline", "Diesel").</summary>
    public string? FuelType { get; init; }

    /// <summary>Body class (e.g. "Sedan", "Hatchback", "SUV").</summary>
    public string? BodyClass { get; init; }

    /// <summary>Vehicle type (e.g. "PASSENGER CAR", "TRUCK").</summary>
    public string? VehicleType { get; init; }

    /// <summary>Engine displacement in litres, verbatim from the provider (e.g. "1.5").</summary>
    public string? EngineDisplacementL { get; init; }

    /// <summary>Number of engine cylinders, verbatim from the provider.</summary>
    public string? EngineCylinders { get; init; }

    /// <summary>Transmission style, verbatim from the provider (e.g. "Manual", "Automatic").</summary>
    public string? TransmissionStyle { get; init; }

    /// <summary>Full manufacturer name from the provider (richer than <see cref="Make"/>).</summary>
    public string? Manufacturer { get; init; }

    /// <summary>Country of the assembly plant, verbatim from the provider.</summary>
    public string? PlantCountry { get; init; }

    /// <summary>Series, when the provider supplies it.</summary>
    public string? Series { get; init; }

    /// <summary>Trim, when the provider supplies it.</summary>
    public string? Trim { get; init; }

    /// <summary>Which decoder produced this result: "offline" or "nhtsa".</summary>
    public string Source { get; init; } = "offline";

    /// <summary>Why the VIN was rejected, when <see cref="IsValid"/> is false.</summary>
    public string? Error { get; init; }

    public static VinDecodeResult Invalid(string vin, string error) =>
        new() { Vin = vin, IsValid = false, Error = error };
}
