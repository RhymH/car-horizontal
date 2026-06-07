using CarHorizontal.Api.Modules.Notifications.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Notifications;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationsService _service;

    public NotificationsController(INotificationsService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<NotificationListResponseDto>> List(
        [FromQuery] NotificationListRequestDto request,
        CancellationToken ct)
        => Ok(await _service.ListAsync(request, ct));

    [HttpGet("unread-count")]
    public async Task<ActionResult<NotificationCountResponseDto>> UnreadCount(CancellationToken ct)
        => Ok(new NotificationCountResponseDto { UnreadCount = await _service.GetUnreadCountAsync(ct) });

    [HttpPost("{id:guid}/read")]
    public async Task<ActionResult<NotificationDto>> MarkRead(Guid id, CancellationToken ct)
        => Ok(await _service.MarkReadAsync(id, ct));

    [HttpPost("{id:guid}/done")]
    public async Task<ActionResult<NotificationDto>> MarkDone(Guid id, CancellationToken ct)
        => Ok(await _service.MarkDoneAsync(id, ct));

    [HttpPost("{id:guid}/dismiss")]
    public async Task<ActionResult<NotificationDto>> Dismiss(Guid id, CancellationToken ct)
        => Ok(await _service.DismissAsync(id, ct));

    [HttpPost("generate")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<GenerateNotificationsResponseDto>> Generate(CancellationToken ct)
        => Ok(new GenerateNotificationsResponseDto { Created = await _service.GenerateForCurrentOrgAsync(ct) });
}
