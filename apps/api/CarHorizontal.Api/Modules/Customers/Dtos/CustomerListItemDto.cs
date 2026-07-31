namespace CarHorizontal.Api.Modules.Customers.Dtos;

public class CustomerListItemDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public int VehicleCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime AcquiredAt { get; set; }
    public string[] Tags { get; set; } = Array.Empty<string>();
    public Guid? SalespersonUserId { get; set; }
    public string? SalespersonName { get; set; }
}

public class CustomersListResponseDto
{
    public IReadOnlyList<CustomerListItemDto> Items { get; set; } = Array.Empty<CustomerListItemDto>();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
