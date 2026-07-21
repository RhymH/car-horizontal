namespace CarHorizontal.Domain.Entities.Customers;

public enum CustomerStatus
{
    Active = 0,
    Inactive = 1,
    Lost = 2,

    /// <summary>Not (yet) a customer of the garage — worked in the leads pipeline.</summary>
    Prospect = 3
}
