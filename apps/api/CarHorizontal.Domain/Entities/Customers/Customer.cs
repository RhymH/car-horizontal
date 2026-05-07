using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Customers;

public class Customer : OrganizationEntityBase
{
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Notes { get; set; }
    public DateTime AcquiredAt { get; set; } = DateTime.UtcNow;
    public CustomerStatus Status { get; set; } = CustomerStatus.Active;
    public string[] Tags { get; set; } = Array.Empty<string>();
}
