using CarHorizontal.Api.Modules.Organizations.Dtos;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Organizations;

[ApiController]
[Authorize]
[Route("api/organizations")]
public class OrganizationsController : ControllerBase
{
    private readonly IOrganizationService _service;
    private readonly IValidator<UpdateOrganizationBrandingRequestDto> _brandingValidator;

    public OrganizationsController(
        IOrganizationService service,
        IValidator<UpdateOrganizationBrandingRequestDto> brandingValidator)
    {
        _service = service;
        _brandingValidator = brandingValidator;
    }

    /// <summary>Configuration marque blanche de l'organisation courante.</summary>
    [HttpGet("branding")]
    public async Task<ActionResult<OrganizationBrandingResponseDto>> GetBranding(CancellationToken ct)
        => Ok(await _service.GetBrandingAsync(ct));

    /// <summary>Met à jour la marque blanche (Owner/Admin uniquement).</summary>
    [HttpPut("branding")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<OrganizationBrandingResponseDto>> UpdateBranding(
        [FromBody] UpdateOrganizationBrandingRequestDto request, CancellationToken ct)
    {
        await _brandingValidator.ValidateAndThrowAsync(request, ct);
        return Ok(await _service.UpdateBrandingAsync(request, ct));
    }
}
