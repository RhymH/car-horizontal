namespace CarHorizontal.Api.Modules.Customers.Dtos;

public class CustomerInteractionDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string Type { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public string Summary { get; set; } = string.Empty;
    public Guid AuthorUserId { get; set; }
}
