using CarHorizontal.Api.Modules.Capabilities;
using CarHorizontal.Api.Modules.Leasing.Dtos;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DomainCapabilities = CarHorizontal.Domain.Capabilities.Capabilities;

namespace CarHorizontal.Api.Modules.Leasing;

/// <summary>
/// CRUD des contrats de leasing. L'ensemble du contrôleur est gaté par la
/// capability "leasing" : si le plugin n'est pas activé pour l'organisation,
/// toutes les routes renvoient 403.
/// </summary>
[ApiController]
[Authorize]
[RequireCapability(DomainCapabilities.Leasing)]
[Route("api/leasing-contracts")]
public class LeasingController : ControllerBase
{
    private readonly ILeasingService _service;
    private readonly IValidator<CreateLeasingContractRequestDto> _createValidator;
    private readonly IValidator<UpdateLeasingContractRequestDto> _updateValidator;

    public LeasingController(
        ILeasingService service,
        IValidator<CreateLeasingContractRequestDto> createValidator,
        IValidator<UpdateLeasingContractRequestDto> updateValidator)
    {
        _service = service;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    [HttpGet]
    public async Task<ActionResult<LeasingContractListResponseDto>> List(
        [FromQuery] LeasingContractListRequestDto request,
        CancellationToken ct)
        => Ok(await _service.ListAsync(request, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LeasingContractDto>> Get(Guid id, CancellationToken ct)
        => Ok(await _service.GetAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<LeasingContractDto>> Create(
        [FromBody] CreateLeasingContractRequestDto request,
        CancellationToken ct)
    {
        await _createValidator.ValidateAndThrowAsync(request, ct);
        var result = await _service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<LeasingContractDto>> Update(
        Guid id,
        [FromBody] UpdateLeasingContractRequestDto request,
        CancellationToken ct)
    {
        await _updateValidator.ValidateAndThrowAsync(request, ct);
        return Ok(await _service.UpdateAsync(id, request, ct));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}
