namespace CarHorizontal.Api.Modules.Customers.Dtos;

public class UpdateCustomerRequestDto
{
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Notes { get; set; }
    public DateTime? AcquiredAt { get; set; }
    public string? Status { get; set; }
    public string[]? Tags { get; set; }

    /// <summary>Assign the customer to this staff account. Ignored when <see cref="ClearSalesperson"/> is true.</summary>
    public Guid? SalespersonUserId { get; set; }

    /// <summary>True = unassign the current salesperson (a null <see cref="SalespersonUserId"/> means "leave unchanged").</summary>
    public bool ClearSalesperson { get; set; }
}
