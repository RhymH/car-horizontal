using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CarHorizontal.Api.Modules.Auth.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Auth;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth)
    {
        _auth = auth;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponseDto>> Register(
        [FromBody] RegisterRequestDto request,
        CancellationToken ct)
    {
        var result = await _auth.RegisterAsync(request, ClientIp(), ClientUserAgent(), ct);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login(
        [FromBody] LoginRequestDto request,
        CancellationToken ct)
    {
        var result = await _auth.LoginAsync(request, ClientIp(), ClientUserAgent(), ct);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<RefreshResponseDto>> Refresh(
        [FromBody] RefreshRequestDto request,
        CancellationToken ct)
    {
        var result = await _auth.RefreshAsync(request, ClientIp(), ClientUserAgent(), ct);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequestDto request, CancellationToken ct)
    {
        await _auth.LogoutAsync(request, ct);
        return NoContent();
    }

    [Authorize]
    [HttpPost("switch-org")]
    public async Task<ActionResult<SwitchOrgResponseDto>> SwitchOrg(
        [FromBody] SwitchOrgRequestDto request,
        CancellationToken ct)
    {
        var userId = RequireUserId();
        var result = await _auth.SwitchOrgAsync(userId, request, ClientIp(), ClientUserAgent(), ct);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<MeResponseDto>> Me(CancellationToken ct)
    {
        var userId = RequireUserId();
        var orgId = ReadOrgIdClaim();
        var me = await _auth.GetMeAsync(userId, orgId, ct);
        return Ok(me);
    }

    private Guid RequireUserId()
    {
        var raw = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(raw, out var id))
        {
            throw new UnauthorizedAccessException("Missing or invalid sub claim.");
        }
        return id;
    }

    private Guid? ReadOrgIdClaim()
    {
        var raw = User.FindFirstValue("org_id");
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    private string ClientIp()
        => HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty;

    private string ClientUserAgent()
        => HttpContext.Request.Headers.UserAgent.ToString();
}
