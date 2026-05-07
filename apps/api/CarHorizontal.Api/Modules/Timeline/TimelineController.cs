using CarHorizontal.Api.Modules.Timeline.Dtos;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Timeline;

[ApiController]
[Authorize]
[Route("api/timeline")]
public class TimelineController : ControllerBase
{
    private readonly ITimelineService _service;
    private readonly IValidator<CreateTimelineEventRequestDto> _createValidator;
    private readonly IValidator<UpdateTimelineEventRequestDto> _updateValidator;
    private readonly IValidator<SnoozeTimelineEventRequestDto> _snoozeValidator;

    public TimelineController(
        ITimelineService service,
        IValidator<CreateTimelineEventRequestDto> createValidator,
        IValidator<UpdateTimelineEventRequestDto> updateValidator,
        IValidator<SnoozeTimelineEventRequestDto> snoozeValidator)
    {
        _service = service;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _snoozeValidator = snoozeValidator;
    }

    [HttpGet]
    public async Task<ActionResult<TimelineListResponseDto>> List(
        [FromQuery] TimelineListRequestDto request,
        CancellationToken ct)
    {
        var result = await _service.ListAsync(request, ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<TimelineEventDto>> Create(
        [FromBody] CreateTimelineEventRequestDto request,
        CancellationToken ct)
    {
        await _createValidator.ValidateAndThrowAsync(request, ct);
        var result = await _service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(List), new { vehicleId = result.VehicleId }, result);
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<TimelineEventDto>> Update(
        Guid id,
        [FromBody] UpdateTimelineEventRequestDto request,
        CancellationToken ct)
    {
        await _updateValidator.ValidateAndThrowAsync(request, ct);
        var result = await _service.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<ActionResult<TimelineEventDto>> Complete(Guid id, CancellationToken ct)
    {
        var result = await _service.CompleteAsync(id, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/skip")]
    public async Task<ActionResult<TimelineEventDto>> Skip(Guid id, CancellationToken ct)
    {
        var result = await _service.SkipAsync(id, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/snooze")]
    public async Task<ActionResult<TimelineEventDto>> Snooze(
        Guid id,
        [FromBody] SnoozeTimelineEventRequestDto request,
        CancellationToken ct)
    {
        await _snoozeValidator.ValidateAndThrowAsync(request, ct);
        var result = await _service.SnoozeAsync(id, request, ct);
        return Ok(result);
    }

    [HttpPost("regenerate")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<RegenerateTimelineResponseDto>> Regenerate(CancellationToken ct)
    {
        var result = await _service.RegenerateAsync(ct);
        return Ok(result);
    }
}
