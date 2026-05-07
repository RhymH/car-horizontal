using CarHorizontal.Api.Modules.Appointments.Dtos;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Appointments;

[ApiController]
[Authorize]
[Route("api/appointments")]
public class AppointmentsController : ControllerBase
{
    private readonly IAppointmentsService _service;
    private readonly IValidator<CreateAppointmentRequestDto> _createValidator;
    private readonly IValidator<UpdateAppointmentRequestDto> _updateValidator;

    public AppointmentsController(
        IAppointmentsService service,
        IValidator<CreateAppointmentRequestDto> createValidator,
        IValidator<UpdateAppointmentRequestDto> updateValidator)
    {
        _service = service;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    [HttpGet]
    public async Task<ActionResult<AppointmentListResponseDto>> List(
        [FromQuery] AppointmentListRequestDto request,
        CancellationToken ct)
    {
        var result = await _service.ListAsync(request, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AppointmentDto>> Get(Guid id, CancellationToken ct)
    {
        var result = await _service.GetAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<AppointmentDto>> Create(
        [FromBody] CreateAppointmentRequestDto request,
        CancellationToken ct)
    {
        await _createValidator.ValidateAndThrowAsync(request, ct);
        var result = await _service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<AppointmentDto>> Update(
        Guid id,
        [FromBody] UpdateAppointmentRequestDto request,
        CancellationToken ct)
    {
        await _updateValidator.ValidateAndThrowAsync(request, ct);
        var result = await _service.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/confirm")]
    public async Task<ActionResult<AppointmentDto>> Confirm(Guid id, CancellationToken ct)
    {
        var result = await _service.ConfirmAsync(id, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<AppointmentDto>> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _service.CancelAsync(id, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/done")]
    public async Task<ActionResult<AppointmentDto>> Done(Guid id, CancellationToken ct)
    {
        var result = await _service.MarkDoneAsync(id, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}
