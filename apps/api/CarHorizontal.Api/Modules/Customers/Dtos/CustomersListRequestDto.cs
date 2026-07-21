namespace CarHorizontal.Api.Modules.Customers.Dtos;

public class CustomersListRequestDto
{
    public string? Search { get; set; }
    public string? Status { get; set; }

    /// <summary>True = leave prospects out (the "Clients" view of the portal).</summary>
    public bool ExcludeProspects { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
    public string? SortBy { get; set; } = "fullName";
    public string? SortDir { get; set; } = "asc";
}
