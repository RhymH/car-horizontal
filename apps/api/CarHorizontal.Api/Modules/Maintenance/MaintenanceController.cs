using CarHorizontal.Api.Modules.Maintenance.Dtos;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Maintenance;

[ApiController]
[Authorize]
public class MaintenanceController : ControllerBase
{
    private readonly IMaintenanceService _maintenance;
    private readonly IValidator<CreateMaintenanceRequestDto> _createValidator;
    private readonly IValidator<UpdateMaintenanceRequestDto> _updateValidator;

    public MaintenanceController(
        IMaintenanceService maintenance,
        IValidator<CreateMaintenanceRequestDto> createValidator,
        IValidator<UpdateMaintenanceRequestDto> updateValidator)
    {
        _maintenance = maintenance;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    [HttpGet("api/vehicles/{vehicleId:guid}/maintenance")]
    public async Task<ActionResult<MaintenanceListResponseDto>> ListByVehicle(
        Guid vehicleId,
        [FromQuery] MaintenanceListRequestDto request,
        CancellationToken ct)
    {
        var result = await _maintenance.ListByVehicleAsync(vehicleId, request, ct);
        return Ok(result);
    }

    [HttpPost("api/vehicles/{vehicleId:guid}/maintenance")]
    public async Task<ActionResult<MaintenanceRecordDto>> Create(
        Guid vehicleId,
        [FromBody] CreateMaintenanceRequestDto request,
        CancellationToken ct)
    {
        await _createValidator.ValidateAndThrowAsync(request, ct);
        var result = await _maintenance.CreateAsync(vehicleId, request, ct);
        return CreatedAtAction(nameof(ListByVehicle), new { vehicleId }, result);
    }

    [HttpPatch("api/maintenance/{id:guid}")]
    public async Task<ActionResult<MaintenanceRecordDto>> Update(
        Guid id,
        [FromBody] UpdateMaintenanceRequestDto request,
        CancellationToken ct)
    {
        await _updateValidator.ValidateAndThrowAsync(request, ct);
        var result = await _maintenance.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("api/maintenance/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _maintenance.DeleteAsync(id, ct);
        return NoContent();
    }
}
