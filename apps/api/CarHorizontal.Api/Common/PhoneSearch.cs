namespace CarHorizontal.Api.Common;

internal static class PhoneSearch
{
    /// <summary>Nombre minimum de chiffres saisis avant de tenter une recherche téléphone.</summary>
    private const int MinDigits = 4;

    /// <summary>
    /// Ramène un fragment de numéro à sa partie nationale : ne garde que les chiffres,
    /// puis retire l'indicatif pays et les zéros de tête. "0611", "+33611" et "0033 6 11"
    /// donnent tous "611", qui matche un numéro stocké en E.164 comme en format local.
    /// Retourne null si la saisie ne contient pas assez de chiffres pour être un numéro.
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

        var national = new string(buffer[..written]).TrimStart('0');
        if (national.Length > 2 && national.StartsWith("33", StringComparison.Ordinal))
        {
            national = national[2..].TrimStart('0');
        }

        return national.Length == 0 ? null : national;
    }
}
