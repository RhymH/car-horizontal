using System.Security.Cryptography;
using CarHorizontal.Domain.Entities.Identity;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CarHorizontal.Api.Modules.Auth;

public class RefreshTokenService : IRefreshTokenService
{
    private const int RawTokenByteLength = 64;

    private readonly AppDbContext _db;
    private readonly JwtOptions _options;

    public RefreshTokenService(AppDbContext db, IOptions<JwtOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

    public async Task<IssuedRefreshToken> IssueAsync(
        Guid userId,
        Guid? organizationId,
        string ipAddress,
        string userAgent,
        CancellationToken ct = default)
    {
        var raw = GenerateRawToken();
        var entity = new RefreshToken
        {
            UserId = userId,
            OrganizationId = organizationId,
            TokenHash = HashToken(raw),
            ExpiresAt = DateTime.UtcNow.AddDays(_options.RefreshDays),
            CreatedByIp = Truncate(ipAddress, 64),
            UserAgent = Truncate(userAgent, 512)
        };

        _db.RefreshTokens.Add(entity);
        await _db.SaveChangesAsync(ct);

        return new IssuedRefreshToken(raw, entity);
    }

    public async Task<RefreshToken?> FindActiveAsync(string rawToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(rawToken))
        {
            return null;
        }

        var hash = HashToken(rawToken);
        var token = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (token is null) return null;
        if (token.RevokedAt is not null) return null;
        if (token.ExpiresAt <= DateTime.UtcNow) return null;

        return token;
    }

    public async Task<IssuedRefreshToken> RotateAsync(
        RefreshToken existing,
        Guid? organizationId,
        string ipAddress,
        string userAgent,
        CancellationToken ct = default)
    {
        var raw = GenerateRawToken();
        var replacement = new RefreshToken
        {
            UserId = existing.UserId,
            OrganizationId = organizationId ?? existing.OrganizationId,
            TokenHash = HashToken(raw),
            ExpiresAt = DateTime.UtcNow.AddDays(_options.RefreshDays),
            CreatedByIp = Truncate(ipAddress, 64),
            UserAgent = Truncate(userAgent, 512)
        };
        _db.RefreshTokens.Add(replacement);

        existing.RevokedAt = DateTime.UtcNow;
        existing.ReplacedByTokenId = replacement.Id;

        await _db.SaveChangesAsync(ct);
        return new IssuedRefreshToken(raw, replacement);
    }

    public async Task RevokeAsync(RefreshToken token, CancellationToken ct = default)
    {
        if (token.RevokedAt is not null) return;
        token.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var active = await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        foreach (var t in active)
        {
            t.RevokedAt = now;
        }
        await _db.SaveChangesAsync(ct);
    }

    private static string GenerateRawToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(RawTokenByteLength);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashToken(string raw)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(raw);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash);
    }

    private static string Truncate(string value, int max)
        => string.IsNullOrEmpty(value) ? string.Empty
           : value.Length <= max ? value
           : value[..max];
}
