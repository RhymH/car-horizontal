namespace CarHorizontal.Api.Modules.Notifications.Dtos;

public class NotificationListRequestDto
{
    /// <summary>Filter by status (New, Read, Done, Dismissed). Empty = open items (New + Read).</summary>
    public string? Status { get; set; }

    /// <summary>Filter by kind (MaintenanceDue, TradeInOpportunity, …).</summary>
    public string? Kind { get; set; }

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
