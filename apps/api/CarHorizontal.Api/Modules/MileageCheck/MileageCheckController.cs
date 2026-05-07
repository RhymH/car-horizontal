using CarHorizontal.Api.Middleware;
using CarHorizontal.Api.Modules.MileageCheck.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.MileageCheck;

[ApiController]
[Route("api")]
public class MileageCheckController : ControllerBase
{
    private readonly IMileageCheckService _service;

    public MileageCheckController(IMileageCheckService service)
    {
        _service = service;
    }

    /// <summary>Public, no-auth: resolve a signed token and return a small public context for the form page.</summary>
    [HttpGet("public/mileage-check/{token}")]
    [AllowAnonymous]
    [NoTenant]
    public async Task<ActionResult<MileageCheckContextDto>> Resolve(string token, CancellationToken ct)
    {
        var ctx = await _service.ResolveAsync(token, ct);
        return Ok(ctx);
    }

    /// <summary>Public, no-auth: client submits their current mileage via the signed link.</summary>
    [HttpPost("public/mileage-check/{token}")]
    [AllowAnonymous]
    [NoTenant]
    public async Task<ActionResult<MileageCheckContextDto>> Submit(
        string token,
        [FromBody] MileageCheckSubmitRequestDto request,
        CancellationToken ct)
    {
        var ctx = await _service.SubmitAsync(token, request.Mileage, ct);
        return Ok(ctx);
    }

    /// <summary>Garage-side: trigger a one-off mileage-check for a vehicle ("Demander au client" button).</summary>
    [HttpPost("vehicles/{vehicleId:guid}/mileage-check")]
    [Authorize]
    public async Task<ActionResult<RequestMileageResponseDto>> RequestCheck(Guid vehicleId, CancellationToken ct)
    {
        var result = await _service.RequestForVehicleAsync(vehicleId, ct);
        return Ok(result);
    }
}
