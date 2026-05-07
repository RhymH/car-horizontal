using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Customers;

public class CustomerInteraction : OrganizationEntityBase
{
    public Guid CustomerId { get; set; }
    public CustomerInteractionType Type { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public string Summary { get; set; } = string.Empty;
    public Guid AuthorUserId { get; set; }
}
