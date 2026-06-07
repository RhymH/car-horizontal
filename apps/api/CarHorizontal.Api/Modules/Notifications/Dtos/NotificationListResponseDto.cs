namespace CarHorizontal.Api.Modules.Notifications.Dtos;

public class NotificationListResponseDto
{
    public List<NotificationDto> Items { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }

    /// <summary>Count of New (unseen) notifications for the current org — drives the badge.</summary>
    public int UnreadCount { get; set; }
}
