using System.Security.Claims;
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
            var raw = _accessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? _accessor.HttpContext?.User?.FindFirstValue("sub");
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }

    public Guid? OrganizationId
    {
        get
        {
            var raw = _accessor.HttpContext?.User?.FindFirstValue("org_id");
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }

    public bool IsAuthenticated => _accessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
}
