namespace CarHorizontal.Api.Modules.Customers.Dtos;

public class CustomersListRequestDto
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
    public string? SortBy { get; set; } = "fullName";
    public string? SortDir { get; set; } = "asc";
}
