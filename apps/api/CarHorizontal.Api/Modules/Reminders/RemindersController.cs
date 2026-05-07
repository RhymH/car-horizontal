using CarHorizontal.Api.Modules.Reminders.Dtos;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Reminders;

[ApiController]
[Authorize]
[Route("api/reminders")]
public class RemindersController : ControllerBase
{
    private readonly IRemindersService _service;
    private readonly IValidator<CreateReminderRequestDto> _createValidator;
    private readonly IValidator<UpdateReminderRequestDto> _updateValidator;
    private readonly IValidator<SnoozeReminderRequestDto> _snoozeValidator;
    private readonly IValidator<CreateFromTimelineRequestDto> _fromTimelineValidator;

    public RemindersController(
        IRemindersService service,
        IValidator<CreateReminderRequestDto> createValidator,
        IValidator<UpdateReminderRequestDto> updateValidator,
        IValidator<SnoozeReminderRequestDto> snoozeValidator,
        IValidator<CreateFromTimelineRequestDto> fromTimelineValidator)
    {
        _service = service;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _snoozeValidator = snoozeValidator;
        _fromTimelineValidator = fromTimelineValidator;
    }

    [HttpGet]
    public async Task<ActionResult<ReminderListResponseDto>> List(
        [FromQuery] ReminderListRequestDto request,
        CancellationToken ct)
    {
        var result = await _service.ListAsync(request, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ReminderDto>> Get(Guid id, CancellationToken ct)
    {
        var result = await _service.GetAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ReminderDto>> Create(
        [FromBody] CreateReminderRequestDto request,
        CancellationToken ct)
    {
        await _createValidator.ValidateAndThrowAsync(request, ct);
        var result = await _service.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<ReminderDto>> Update(
        Guid id,
        [FromBody] UpdateReminderRequestDto request,
        CancellationToken ct)
    {
        await _updateValidator.ValidateAndThrowAsync(request, ct);
        var result = await _service.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<ReminderDto>> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _service.CancelAsync(id, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/send-now")]
    public async Task<ActionResult<ReminderDto>> SendNow(Guid id, CancellationToken ct)
    {
        var result = await _service.SendNowAsync(id, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/snooze")]
    public async Task<ActionResult<ReminderDto>> Snooze(
        Guid id,
        [FromBody] SnoozeReminderRequestDto request,
        CancellationToken ct)
    {
        await _snoozeValidator.ValidateAndThrowAsync(request, ct);
        var result = await _service.SnoozeAsync(id, request, ct);
        return Ok(result);
    }

    [HttpPost("from-timeline/{timelineEventId:guid}")]
    public async Task<ActionResult<ReminderDto>> CreateFromTimeline(
        Guid timelineEventId,
        [FromBody] CreateFromTimelineRequestDto? request,
        CancellationToken ct)
    {
        request ??= new CreateFromTimelineRequestDto();
        await _fromTimelineValidator.ValidateAndThrowAsync(request, ct);
        var result = await _service.CreateFromTimelineEventAsync(timelineEventId, request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }
}
