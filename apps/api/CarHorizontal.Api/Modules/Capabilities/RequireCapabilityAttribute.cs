using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CarHorizontal.Api.Modules.Capabilities;

/// <summary>
/// Gates a controller or action behind a plugin capability: if the capability is
/// not enabled for the current organization, the request is rejected with
/// 403 (application/problem+json) before the action runs.
/// Apply with <c>[RequireCapability(Capabilities.Leasing)]</c>.
/// Combine with <c>[Authorize]</c> so authentication is enforced first.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class RequireCapabilityAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string _capability;

    public RequireCapabilityAttribute(string capability) => _capability = capability;

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var service = context.HttpContext.RequestServices.GetRequiredService<ICapabilityService>();
        var enabled = await service.IsEnabledAsync(_capability, context.HttpContext.RequestAborted);
        if (enabled) return;

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status403Forbidden,
            Title = "Module non activé",
            Detail = $"Le module « {_capability} » n'est pas activé pour cette organisation."
        };
        context.Result = new ObjectResult(problem)
        {
            StatusCode = StatusCodes.Status403Forbidden,
            ContentTypes = { "application/problem+json" }
        };
    }
}
