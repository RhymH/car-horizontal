using System.Security.Cryptography;
using System.Text;

namespace CarHorizontal.Api.Modules.MileageCheck;

/// <summary>
/// HMAC-signed signed-link token. Format (base64url-encoded blocks separated by '.'):
/// {payloadBase64}.{signatureBase64}
/// where payload is "{vehicleId:N}|{organizationId:N}|{expiresUnix}".
/// </summary>
public sealed class MileageCheckTokens
{
    private readonly byte[] _key;

    public MileageCheckTokens(string secret)
    {
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 16)
            throw new ArgumentException("Mileage-check secret must be at least 16 chars.", nameof(secret));
        _key = Encoding.UTF8.GetBytes(secret);
    }

    public string Issue(Guid vehicleId, Guid organizationId, DateTime expiresAt)
    {
        var expiresUnix = new DateTimeOffset(DateTime.SpecifyKind(expiresAt, DateTimeKind.Utc)).ToUnixTimeSeconds();
        var payload = $"{vehicleId:N}|{organizationId:N}|{expiresUnix}";
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var signature = HmacSign(payloadBytes);
        return $"{Base64UrlEncode(payloadBytes)}.{Base64UrlEncode(signature)}";
    }

    public bool TryRead(string token, out MileageCheckTokenData data)
    {
        data = default;
        if (string.IsNullOrWhiteSpace(token)) return false;
        var parts = token.Split('.', 2);
        if (parts.Length != 2) return false;

        byte[] payloadBytes, signature;
        try
        {
            payloadBytes = Base64UrlDecode(parts[0]);
            signature = Base64UrlDecode(parts[1]);
        }
        catch
        {
            return false;
        }

        var expected = HmacSign(payloadBytes);
        if (!CryptographicOperations.FixedTimeEquals(signature, expected)) return false;

        var payload = Encoding.UTF8.GetString(payloadBytes);
        var fields = payload.Split('|');
        if (fields.Length != 3) return false;
        if (!Guid.TryParseExact(fields[0], "N", out var vehicleId)) return false;
        if (!Guid.TryParseExact(fields[1], "N", out var orgId)) return false;
        if (!long.TryParse(fields[2], out var expiresUnix)) return false;

        data = new MileageCheckTokenData(
            vehicleId,
            orgId,
            DateTimeOffset.FromUnixTimeSeconds(expiresUnix).UtcDateTime);
        return true;
    }

    private byte[] HmacSign(byte[] payload)
    {
        using var hmac = new HMACSHA256(_key);
        return hmac.ComputeHash(payload);
    }

    private static string Base64UrlEncode(byte[] bytes)
        => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var s = value.Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4)
        {
            case 2: s += "=="; break;
            case 3: s += "="; break;
        }
        return Convert.FromBase64String(s);
    }
}

public readonly record struct MileageCheckTokenData(Guid VehicleId, Guid OrganizationId, DateTime ExpiresAt);
