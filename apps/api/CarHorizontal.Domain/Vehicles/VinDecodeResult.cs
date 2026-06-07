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

    /// <summary>Why the VIN was rejected, when <see cref="IsValid"/> is false.</summary>
    public string? Error { get; init; }

    public static VinDecodeResult Invalid(string vin, string error) =>
        new() { Vin = vin, IsValid = false, Error = error };
}
