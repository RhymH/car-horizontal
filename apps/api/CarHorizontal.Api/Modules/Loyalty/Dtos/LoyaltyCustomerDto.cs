namespace CarHorizontal.Api.Modules.Loyalty.Dtos;

public class LoyaltyCustomerDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public DateTime? LastContactAt { get; set; }
    public int? DaysSinceLastContact { get; set; }
    public int VehicleCount { get; set; }
}

public class LoyaltyCustomerListResponseDto
{
    public List<LoyaltyCustomerDto> Items { get; set; } = new();
    public int Total { get; set; }
}
