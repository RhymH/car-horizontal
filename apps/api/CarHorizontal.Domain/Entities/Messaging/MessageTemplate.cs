using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Messaging;

public class MessageTemplate : OrganizationEntityBase
{
    public string Code { get; set; } = string.Empty;
    public MessageChannel Channel { get; set; }
    public string? Subject { get; set; }
    public string Body { get; set; } = string.Empty;
    public string Variables { get; set; } = "{}";
    public bool Active { get; set; } = true;
}
