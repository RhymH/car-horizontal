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

    /// <summary>
    /// Staff account following this customer/prospect commercially. Optional:
    /// null means nobody is assigned. Must be a member of the same organization.
    /// </summary>
    public Guid? SalespersonUserId { get; set; }

    /// <summary>
    /// Identity key of this record in an external source (bulk import). Unique
    /// per organization when set — re-importing the same file updates instead
    /// of duplicating.
    /// </summary>
    public string? ExternalRef { get; set; }

    /// <summary>
    /// When this record was merged into another customer (duplicate
    /// reconciliation), the surviving customer's id. The record itself is
    /// soft-deleted.
    /// </summary>
    public Guid? MergedIntoCustomerId { get; set; }
}
