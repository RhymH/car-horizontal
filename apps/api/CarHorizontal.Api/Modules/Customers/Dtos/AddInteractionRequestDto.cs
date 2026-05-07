namespace CarHorizontal.Api.Modules.Customers.Dtos;

public class AddInteractionRequestDto
{
    public string Type { get; set; } = "Note";
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public string Summary { get; set; } = string.Empty;
}
