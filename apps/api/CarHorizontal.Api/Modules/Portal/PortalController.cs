using CarHorizontal.Api.Modules.Auth;
using CarHorizontal.Api.Modules.Portal.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Portal;

/// <summary>Données du portail client. Réservé aux comptes Customer (policy CustomerOnly).</summary>
[ApiController]
[Authorize(Policy = AuthPolicies.CustomerOnly)]
[Route("api/portal")]
public class PortalController : ControllerBase
{
    private readonly IPortalService _service;

    public PortalController(IPortalService service) => _service = service;

    /// <summary>Profil du client connecté.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<PortalProfileDto>> Me(CancellationToken ct)
        => Ok(await _service.GetProfileAsync(ct));

    /// <summary>Véhicules du client + prochaines échéances.</summary>
    [HttpGet("vehicles")]
    public async Task<ActionResult<List<PortalVehicleDto>>> Vehicles(CancellationToken ct)
        => Ok(await _service.GetVehiclesAsync(ct));

    /// <summary>Le client déclare le kilométrage actuel de son véhicule.</summary>
    [HttpPost("vehicles/{id:guid}/mileage")]
    public async Task<IActionResult> SubmitMileage(
        Guid id, [FromBody] SubmitMileageRequestDto request, CancellationToken ct)
    {
        await _service.SubmitMileageAsync(id, request.Mileage, ct);
        return NoContent();
    }
}
