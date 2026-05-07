using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CarHorizontal.Api.Middleware;
using CarHorizontal.Infrastructure.Persistence;

namespace CarHorizontal.Api.Common;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentUserService(IHttpContextAccessor accessor)
    {
        _accessor = accessor;
    }

    public Guid? UserId
    {
        get
        {
            var raw = _accessor.HttpContext?.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? _accessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }

    public Guid? OrganizationId
    {
        get
        {
            var ctx = _accessor.HttpContext;
            if (ctx is null) return null;

            if (ctx.Items.TryGetValue(CurrentOrganizationMiddleware.ValidatedOrgIdItemKey, out var validated)
                && validated is Guid validatedGuid)
            {
                return validatedGuid;
            }

            return null;
        }
    }

    public string? Role
    {
        get
        {
            var ctx = _accessor.HttpContext;
            if (ctx is null) return null;
            if (ctx.Items.TryGetValue(CurrentOrganizationMiddleware.ValidatedRoleItemKey, out var role) && role is string s)
            {
                return s;
            }
            return ctx.User?.FindFirstValue(ClaimTypes.Role);
        }
    }

    public bool IsAuthenticated => _accessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
}
