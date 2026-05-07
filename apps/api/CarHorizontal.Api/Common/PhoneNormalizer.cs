using System.Text.RegularExpressions;

namespace CarHorizontal.Api.Common;

/// <summary>
/// Tolerant phone-number cleanup. Accepts the formats a person at the
/// front desk would actually type ("06 12 34 56 78", "+33 6 12 34 56 78",
/// "0033 6 12 34 56 78", "06.12.34.56.78") and produces a canonical
/// E.164-ish value when possible. The country code from the active
/// organisation fills in the prefix for national numbers.
/// </summary>
public static class PhoneNormalizer
{
    private static readonly Regex AllowedChars = new(@"[^\d+]", RegexOptions.Compiled);
    private static readonly Regex Canonical = new(@"^\+\d{7,15}$", RegexOptions.Compiled);

    public static string? Normalize(string? raw, string? defaultCountryCode)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;

        // Strip everything that isn't a digit or '+'.
        var stripped = AllowedChars.Replace(raw.Trim(), string.Empty);
        if (string.IsNullOrEmpty(stripped)) return null;

        // International prefix variants.
        if (stripped.StartsWith("00", StringComparison.Ordinal))
            stripped = "+" + stripped[2..];

        // National notation (e.g. "0612...") → prepend the org country code,
        // dropping the trunk-prefix leading zero.
        if (!stripped.StartsWith('+'))
        {
            var cc = NormaliseCountryCode(defaultCountryCode);
            if (cc is null) return null; // can't canonicalise without a country code
            stripped = stripped.TrimStart('0');
            if (stripped.Length == 0) return null;
            stripped = cc + stripped;
        }

        return Canonical.IsMatch(stripped) ? stripped : null;
    }

    /// <summary>True if the value looks like something we could normalise.</summary>
    public static bool IsAcceptable(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return true;
        var stripped = AllowedChars.Replace(raw.Trim(), string.Empty);
        if (stripped.StartsWith('+')) stripped = stripped[1..];
        if (stripped.StartsWith("00", StringComparison.Ordinal)) stripped = stripped[2..];
        // 6 digits is the floor for any plausible local number; 15 is the ITU max.
        return stripped.Length is >= 6 and <= 15 && stripped.All(char.IsDigit);
    }

    private static string? NormaliseCountryCode(string? cc)
    {
        if (string.IsNullOrWhiteSpace(cc)) return null;
        var t = cc.Trim();
        if (!t.StartsWith('+')) t = "+" + t.TrimStart('0');
        return Canonical.IsMatch(t + "0000000") ? t : null;
    }
}
