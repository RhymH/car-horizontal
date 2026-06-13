using CarHorizontal.Api.Modules.Portal.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Portal;

/// <summary>Actions staff liées au portail client (réservées au staff via la policy par défaut).</summary>
[ApiController]
[Authorize]
[Route("api/customers")]
public class CustomerPortalController : ControllerBase
{
    private readonly IPortalAuthService _service;

    public CustomerPortalController(IPortalAuthService service) => _service = service;

    /// <summary>Invite le client (crée/ré-invite son compte portail) depuis sa fiche.</summary>
    [HttpPost("{id:guid}/portal-invite")]
    public async Task<ActionResult<PortalInviteResponseDto>> Invite(Guid id, CancellationToken ct)
        => Ok(await _service.InviteAsync(id, ct));
}
