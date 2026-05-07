using System.Text;

namespace CarHorizontal.Api.Common;

internal static class PlateSearch
{
    /// <summary>
    /// Build a Postgres-compatible regex that matches a license plate by ignoring
    /// any non-alphanumeric character on either side of the comparison. The query
    /// uses <see cref="System.Text.RegularExpressions.Regex.IsMatch(string, string)"/>
    /// which Npgsql translates to the <c>~</c> operator.
    /// </summary>
    /// <example>
    /// Input "AA-111-AA" → "A[^A-Za-z0-9]*A[^A-Za-z0-9]*1[^A-Za-z0-9]*1[^A-Za-z0-9]*1[^A-Za-z0-9]*A[^A-Za-z0-9]*A[^A-Za-z0-9]*".
    /// Returns null when the input has no alphanumeric character. Callers should
    /// pass <see cref="System.Text.RegularExpressions.RegexOptions.IgnoreCase"/> so
    /// Npgsql translates the match to the case-insensitive <c>~*</c> operator.
    /// </example>
    public static string? BuildLikeRegex(string? raw)
    {
        if (string.IsNullOrEmpty(raw)) return null;

        var sb = new StringBuilder();
        var hasContent = false;
        foreach (var ch in raw)
        {
            if ((ch >= '0' && ch <= '9') || (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z'))
            {
                sb.Append(ch);
                sb.Append("[^A-Za-z0-9]*");
                hasContent = true;
            }
        }

        return hasContent ? sb.ToString() : null;
    }
}
