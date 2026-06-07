using CarHorizontal.Api.Modules.Notifications.Dtos;

namespace CarHorizontal.Api.Modules.Notifications;

public interface INotificationsService
{
    Task<NotificationListResponseDto> ListAsync(NotificationListRequestDto request, CancellationToken ct = default);
    Task<int> GetUnreadCountAsync(CancellationToken ct = default);
    Task<NotificationDto> MarkReadAsync(Guid id, CancellationToken ct = default);
    Task<NotificationDto> MarkDoneAsync(Guid id, CancellationToken ct = default);
    Task<NotificationDto> DismissAsync(Guid id, CancellationToken ct = default);
    Task<int> GenerateForCurrentOrgAsync(CancellationToken ct = default);
}
