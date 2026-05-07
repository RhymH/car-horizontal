using System.Security.Claims;
using CarHorizontal.Domain.Entities.Identity;

namespace CarHorizontal.Api.Modules.Auth;

public interface IJwtTokenService
{
    AccessTokenResult CreateAccessToken(AppUser user, Guid? organizationId, string? role);

    ClaimsPrincipal? ValidateAccessToken(string token);
}

public record AccessTokenResult(string Token, DateTime ExpiresAt, string TokenId);
