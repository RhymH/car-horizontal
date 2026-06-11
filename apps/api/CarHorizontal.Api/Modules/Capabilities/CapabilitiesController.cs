using CarHorizontal.Api.Modules.Capabilities.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Capabilities;

[ApiController]
[Authorize]
[Route("api")]
public class CapabilitiesController : ControllerBase
{
    private readonly ICapabilityService _service;

    public CapabilitiesController(ICapabilityService service) => _service = service;

    /// <summary>
    /// Effective plugin capabilities for the current organization. The front-ends
    /// use this to show/hide plugin UIs.
    /// </summary>
    [HttpGet("me/capabilities")]
    public async Task<ActionResult<IReadOnlyList<CapabilityStatusDto>>> GetMine(CancellationToken ct)
        => Ok(await _service.GetEffectiveAsync(ct));

    /// <summary>Enable/disable a plugin capability for the current org (Owner/Admin only).</summary>
    [HttpPut("organizations/capabilities/{key}")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<IActionResult> SetCapability(
        string key,
        [FromBody] SetCapabilityRequestDto request,
        CancellationToken ct)
    {
        await _service.SetAsync(key, request.Enabled, ct);
        return NoContent();
    }
}
