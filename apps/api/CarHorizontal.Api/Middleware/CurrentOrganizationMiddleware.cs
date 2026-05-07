using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Middleware;

public class CurrentOrganizationMiddleware
{
    public const string ValidatedOrgIdItemKey = "__ch.validatedOrgId";
    public const string ValidatedRoleItemKey = "__ch.validatedRole";

    private readonly RequestDelegate _next;

    public CurrentOrganizationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        var user = context.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        var endpoint = context.GetEndpoint();
        var allowAnonymous = endpoint?.Metadata.GetMetadata<IAllowAnonymous>() is not null;
        var noTenant = endpoint?.Metadata.GetMetadata<NoTenantAttribute>() is not null;

        if (allowAnonymous || noTenant)
        {
            await _next(context);
            return;
        }

        var rawOrg = user.FindFirstValue("org_id");
        if (string.IsNullOrEmpty(rawOrg))
        {
            await _next(context);
            return;
        }

        if (!Guid.TryParse(rawOrg, out var orgId))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        var rawUserId = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(rawUserId, out var userId))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        var membership = await db.UserOrganizations
            .AsNoTracking()
            .FirstOrDefaultAsync(uo => uo.UserId == userId && uo.OrganizationId == orgId);

        if (membership is null)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }

        context.Items[ValidatedOrgIdItemKey] = membership.OrganizationId;
        context.Items[ValidatedRoleItemKey] = membership.Role.ToString();

        await _next(context);
    }
}
