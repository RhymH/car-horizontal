using CarHorizontal.Api.Modules.Portal.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Portal;

/// <summary>Auth du portail client (anonyme : pas encore de token).</summary>
[ApiController]
[AllowAnonymous]
[Route("api/portal/auth")]
public class PortalAuthController : ControllerBase
{
    private readonly IPortalAuthService _service;

    public PortalAuthController(IPortalAuthService service) => _service = service;

    [HttpPost("login")]
    public async Task<ActionResult<PortalSessionResponseDto>> Login(
        [FromBody] PortalLoginRequestDto request, CancellationToken ct)
        => Ok(await _service.LoginAsync(request, Ip(), UserAgent(), ct));

    [HttpPost("accept-invite")]
    public async Task<ActionResult<PortalSessionResponseDto>> AcceptInvite(
        [FromBody] AcceptInviteRequestDto request, CancellationToken ct)
        => Ok(await _service.AcceptInviteAsync(request, Ip(), UserAgent(), ct));

    private string Ip() => HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty;
    private string UserAgent() => Request.Headers.UserAgent.ToString();
}
