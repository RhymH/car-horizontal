using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using CarHorizontal.Domain.Vehicles;
using Microsoft.Extensions.Logging;

namespace CarHorizontal.Infrastructure.Vehicles;

/// <summary>
/// Online VIN decoder backed by the NHTSA vPIC public API
/// (<c>DecodeVinValues</c>). Free, key-less, US-government run, with good
/// coverage of mainstream EU makes. It decodes far more than the offline table
/// (model, fuel, displacement, body class, transmission…).
///
/// Resilience is first-class: the VIN is validated structurally offline before
/// any network call (a malformed VIN never hits the wire), and any network
/// failure, timeout, or unparseable payload degrades gracefully to the offline
/// result — the decode endpoint never fails because vPIC is slow or down.
/// </summary>
public sealed class NhtsaVinDecoder : IVinDecoder
{
    private readonly HttpClient _http;
    private readonly OfflineVinDecoder _offline;
    private readonly ILogger<NhtsaVinDecoder> _logger;

    public NhtsaVinDecoder(HttpClient http, OfflineVinDecoder offline, ILogger<NhtsaVinDecoder> logger)
    {
        _http = http;
        _offline = offline;
        _logger = logger;
    }

    public async Task<VinDecodeResult> DecodeAsync(string? vin, CancellationToken ct = default)
    {
        // Offline first: it validates structure and gives us a baseline to
        // enrich and to fall back to. A malformed VIN short-circuits here.
        var baseline = _offline.Decode(vin);
        if (!baseline.IsValid)
            return baseline;

        try
        {
            var payload = await _http.GetFromJsonAsync<NhtsaResponse>(
                $"DecodeVinValues/{baseline.Vin}?format=json", ct);

            var r = payload?.Results?.FirstOrDefault();
            if (r is null)
            {
                _logger.LogWarning("NHTSA returned no results for VIN {Vin}; using offline decode.", baseline.Vin);
                return baseline;
            }

            return Merge(baseline, r);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw; // caller aborted — not a provider failure
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "NHTSA decode failed for VIN {Vin}; falling back to offline decode.", baseline.Vin);
            return baseline;
        }
    }

    /// <summary>
    /// Overlays NHTSA fields onto the offline baseline. Offline wins for
    /// <see cref="VinDecodeResult.Make"/>/<see cref="VinDecodeResult.Country"/>
    /// (curated French labels), NHTSA fills everything the offline table cannot.
    /// </summary>
    private static VinDecodeResult Merge(VinDecodeResult baseline, NhtsaResult r)
    {
        var year = ParseYear(r.ModelYear) ?? baseline.ModelYear;

        return baseline with
        {
            Source = "nhtsa",
            Make = baseline.Make ?? TitleCase(Clean(r.Make)),
            ModelYear = year,
            Model = TitleCase(Clean(r.Model)),
            FuelType = Clean(r.FuelTypePrimary),
            BodyClass = Clean(r.BodyClass),
            VehicleType = Clean(r.VehicleType),
            EngineDisplacementL = Clean(r.DisplacementL),
            EngineCylinders = Clean(r.EngineCylinders),
            TransmissionStyle = Clean(r.TransmissionStyle),
            Manufacturer = Clean(r.ManufacturerName),
            PlantCountry = Clean(r.PlantCountry),
            Series = Clean(r.Series),
            Trim = Clean(r.Trim),
        };
    }

    /// <summary>vPIC uses empty strings and "Not Applicable" for unknown fields.</summary>
    private static string? Clean(string? value)
    {
        var v = value?.Trim();
        if (string.IsNullOrEmpty(v)) return null;
        return v.Equals("Not Applicable", StringComparison.OrdinalIgnoreCase) ? null : v;
    }

    private static int? ParseYear(string? value) =>
        int.TryParse(Clean(value), NumberStyles.Integer, CultureInfo.InvariantCulture, out var y) ? y : null;

    // vPIC returns makes/models in upper case ("RENAULT", "CLIO"); title-case for display.
    private static string? TitleCase(string? value)
    {
        if (value is null) return null;
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(value.ToLowerInvariant());
    }

    private sealed class NhtsaResponse
    {
        [JsonPropertyName("Results")] public List<NhtsaResult>? Results { get; set; }
    }

    private sealed class NhtsaResult
    {
        [JsonPropertyName("Make")] public string? Make { get; set; }
        [JsonPropertyName("Model")] public string? Model { get; set; }
        [JsonPropertyName("ModelYear")] public string? ModelYear { get; set; }
        [JsonPropertyName("FuelTypePrimary")] public string? FuelTypePrimary { get; set; }
        [JsonPropertyName("BodyClass")] public string? BodyClass { get; set; }
        [JsonPropertyName("VehicleType")] public string? VehicleType { get; set; }
        [JsonPropertyName("DisplacementL")] public string? DisplacementL { get; set; }
        [JsonPropertyName("EngineCylinders")] public string? EngineCylinders { get; set; }
        [JsonPropertyName("TransmissionStyle")] public string? TransmissionStyle { get; set; }
        [JsonPropertyName("ManufacturerName")] public string? ManufacturerName { get; set; }
        [JsonPropertyName("PlantCountry")] public string? PlantCountry { get; set; }
        [JsonPropertyName("Series")] public string? Series { get; set; }
        [JsonPropertyName("Trim")] public string? Trim { get; set; }
    }
}
