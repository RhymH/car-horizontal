namespace CarHorizontal.Api.Modules.Customers.Dtos;

public class CreateCustomerRequestDto
{
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Notes { get; set; }
    public DateTime AcquiredAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Active";
    public string[] Tags { get; set; } = Array.Empty<string>();

    /// <summary>Optional staff account following this customer commercially.</summary>
    public Guid? SalespersonUserId { get; set; }
}
