using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Messaging;

public class MessageLog : OrganizationEntityBase
{
    public Guid CustomerId { get; set; }
    public Guid? ReminderId { get; set; }
    public MessageChannel Channel { get; set; }
    public string Recipient { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public string Body { get; set; } = string.Empty;
    public MessageStatus Status { get; set; } = MessageStatus.Pending;
    public string? ProviderMessageId { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public string? ErrorMessage { get; set; }
}
