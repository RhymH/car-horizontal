using CarHorizontal.Domain.Entities.Identity;

namespace CarHorizontal.Api.Modules.Auth;

public interface IRefreshTokenService
{
    Task<IssuedRefreshToken> IssueAsync(
        Guid userId,
        Guid? organizationId,
        string ipAddress,
        string userAgent,
        CancellationToken ct = default);

    Task<RefreshToken?> FindActiveAsync(string rawToken, CancellationToken ct = default);

    Task<IssuedRefreshToken> RotateAsync(
        RefreshToken existing,
        Guid? organizationId,
        string ipAddress,
        string userAgent,
        CancellationToken ct = default);

    Task RevokeAsync(RefreshToken token, CancellationToken ct = default);

    Task RevokeAllForUserAsync(Guid userId, CancellationToken ct = default);
}

public record IssuedRefreshToken(string RawToken, RefreshToken Entity);
