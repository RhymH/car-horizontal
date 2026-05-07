namespace CarHorizontal.Api.Common;

internal static class PhoneSearch
{
    private const int MinDigits = 6;

    /// <summary>
    /// If the input contains enough digits to look like a phone fragment, returns the
    /// digits with leading zeros stripped (so "0612345678" matches a stored "+33612345678").
    /// </summary>
    public static string? ExtractDigitSuffix(string raw)
    {
        if (string.IsNullOrEmpty(raw)) return null;

        Span<char> buffer = stackalloc char[raw.Length];
        var written = 0;
        foreach (var ch in raw)
        {
            if (ch >= '0' && ch <= '9')
            {
                buffer[written++] = ch;
            }
        }

        if (written < MinDigits) return null;

        var digits = new string(buffer[..written]);
        var trimmed = digits.TrimStart('0');
        return trimmed.Length >= MinDigits ? trimmed : null;
    }
}
