using CarHorizontal.Domain.Vehicles;

namespace CarHorizontal.Infrastructure.Vehicles;

/// <summary>
/// Offline VIN decoder (ISO 3779 structure). Validation is intentionally
/// structural only — length 17 + valid charset — because the North-American
/// check-digit (position 9) is widely ignored by European manufacturers, so
/// enforcing it would reject most French/German VINs. Make comes from a
/// World-Manufacturer-Identifier table focused on the FR/EU market; the model
/// year from position 10, disambiguated by position 7.
/// </summary>
public class VinDecoder : IVinDecoder
{
    // Codes I, O, Q are never used in a VIN.
    private const string AllowedChars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";

    // 30-code model-year cycle (no I,O,Q,U,Z,0). Index 0 => 1980 / 2010.
    private const string YearSeq = "ABCDEFGHJKLMNPRSTVWXY123456789";

    private readonly TimeProvider _clock;

    public VinDecoder(TimeProvider? clock = null) => _clock = clock ?? TimeProvider.System;

    public VinDecodeResult Decode(string? vin)
    {
        var raw = (vin ?? string.Empty).Trim().ToUpperInvariant().Replace(" ", "");

        if (raw.Length == 0)
            return VinDecodeResult.Invalid(raw, "VIN vide.");
        if (raw.Length != 17)
            return VinDecodeResult.Invalid(raw, $"Un VIN doit comporter 17 caractères (reçu : {raw.Length}).");
        foreach (var c in raw)
        {
            if (!AllowedChars.Contains(c))
                return VinDecodeResult.Invalid(raw, $"Caractère invalide dans le VIN : '{c}'.");
        }

        var wmi = raw[..3];
        var (make, country) = ResolveManufacturer(wmi);
        var year = ResolveYear(raw[9], raw[6]);

        return new VinDecodeResult
        {
            Vin = raw,
            IsValid = true,
            Wmi = wmi,
            Make = make,
            Country = country,
            ModelYear = year
        };
    }

    private int? ResolveYear(char yearCode, char pos7)
    {
        var idx = YearSeq.IndexOf(yearCode);
        if (idx < 0) return null;

        // Passenger-car rule: position 7 is a letter for model years 2010+,
        // a digit for 1980–2009.
        var modern = char.IsLetter(pos7);
        var year = (modern ? 2010 : 1980) + idx;

        // Guard against an implausible future year (decode is a suggestion).
        var maxYear = _clock.GetUtcNow().Year + 1;
        if (year > maxYear) year -= 30;
        return year;
    }

    private static (string? Make, string? Country) ResolveManufacturer(string wmi)
    {
        if (Wmis.TryGetValue(wmi, out var exact)) return exact;
        // Some manufacturers share a 2-char prefix across many 3rd chars.
        if (Wmis.TryGetValue(wmi[..2], out var byPrefix)) return byPrefix;
        return (null, RegionForFirstChar(wmi[0]));
    }

    private static string? RegionForFirstChar(char c) => c switch
    {
        >= '1' and <= '5' => "Amérique du Nord",
        '6' or '7' => "Océanie",
        '8' or '9' => "Amérique du Sud",
        >= 'A' and <= 'H' => "Afrique",
        >= 'J' and <= 'R' => "Asie",
        >= 'S' and <= 'Z' => "Europe",
        _ => null
    };

    // FR/EU-focused manufacturer table (3-char WMI, with a few 2-char fallbacks).
    private static readonly Dictionary<string, (string Make, string Country)> Wmis = new(StringComparer.Ordinal)
    {
        // France
        ["VF1"] = ("Renault", "France"),
        ["VF2"] = ("Renault", "France"),
        ["VF3"] = ("Peugeot", "France"),
        ["VF7"] = ("Citroën", "France"),
        ["VF6"] = ("Renault Trucks", "France"),
        ["VR1"] = ("DS Automobiles", "France"),
        ["VR3"] = ("Peugeot", "France"),
        ["VR7"] = ("Citroën", "France"),
        ["VNK"] = ("Toyota", "France"),
        ["UU1"] = ("Dacia", "Roumanie"),
        ["VF"] = ("Constructeur français", "France"),
        // Germany
        ["WVW"] = ("Volkswagen", "Allemagne"),
        ["WV1"] = ("Volkswagen Utilitaires", "Allemagne"),
        ["WV2"] = ("Volkswagen Utilitaires", "Allemagne"),
        ["WAU"] = ("Audi", "Allemagne"),
        ["WUA"] = ("Audi Sport", "Allemagne"),
        ["TRU"] = ("Audi", "Hongrie"),
        ["WBA"] = ("BMW", "Allemagne"),
        ["WBS"] = ("BMW M", "Allemagne"),
        ["WBY"] = ("BMW i", "Allemagne"),
        ["WDB"] = ("Mercedes-Benz", "Allemagne"),
        ["WDD"] = ("Mercedes-Benz", "Allemagne"),
        ["WDC"] = ("Mercedes-Benz", "Allemagne"),
        ["W1K"] = ("Mercedes-Benz", "Allemagne"),
        ["WME"] = ("Smart", "Allemagne"),
        ["W0L"] = ("Opel", "Allemagne"),
        ["W0V"] = ("Opel", "Allemagne"),
        ["WP0"] = ("Porsche", "Allemagne"),
        ["WP1"] = ("Porsche SUV", "Allemagne"),
        // Italy
        ["ZFA"] = ("Fiat", "Italie"),
        ["ZFF"] = ("Ferrari", "Italie"),
        ["ZAR"] = ("Alfa Romeo", "Italie"),
        ["ZLA"] = ("Lancia", "Italie"),
        ["ZHW"] = ("Lamborghini", "Italie"),
        // Spain / Czech
        ["VSS"] = ("SEAT", "Espagne"),
        ["VSX"] = ("Opel", "Espagne"),
        ["TMB"] = ("Škoda", "Tchéquie"),
        // UK
        ["SAL"] = ("Land Rover", "Royaume-Uni"),
        ["SAJ"] = ("Jaguar", "Royaume-Uni"),
        ["SCC"] = ("Lotus", "Royaume-Uni"),
        ["SCF"] = ("Aston Martin", "Royaume-Uni"),
        ["SB1"] = ("Toyota", "Royaume-Uni"),
        ["SJN"] = ("Nissan", "Royaume-Uni"),
        // Sweden
        ["YV1"] = ("Volvo", "Suède"),
        ["YV4"] = ("Volvo", "Suède"),
        ["YS3"] = ("Saab", "Suède"),
        // Korea
        ["KMH"] = ("Hyundai", "Corée du Sud"),
        ["KNA"] = ("Kia", "Corée du Sud"),
        ["KND"] = ("Kia", "Corée du Sud"),
        // Japan
        ["JHM"] = ("Honda", "Japon"),
        ["JTD"] = ("Toyota", "Japon"),
        ["JT1"] = ("Toyota", "Japon"),
        ["JN1"] = ("Nissan", "Japon"),
        ["JMZ"] = ("Mazda", "Japon"),
        ["JF1"] = ("Subaru", "Japon"),
        ["JS"] = ("Suzuki", "Japon"),
        // USA (common imports)
        ["1FA"] = ("Ford", "États-Unis"),
        ["1G1"] = ("Chevrolet", "États-Unis"),
        ["5YJ"] = ("Tesla", "États-Unis"),
    };
}
