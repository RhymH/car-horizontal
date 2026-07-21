namespace CarHorizontal.Api.Modules.Leads.Dtos;

public class LeadDuplicatesResponseDto
{
    public List<LeadDuplicateGroupDto> Groups { get; set; } = new();
}

public class LeadDuplicateGroupDto
{
    /// <summary>"Phone" or "Email" — the identity signal the group shares.</summary>
    public string MatchType { get; set; } = string.Empty;

    /// <summary>The shared value (E.164 phone or lower-cased email).</summary>
    public string Value { get; set; } = string.Empty;

    public List<LeadDuplicateCustomerDto> Customers { get; set; } = new();
}

public class LeadDuplicateCustomerDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public string[] Tags { get; set; } = Array.Empty<string>();
    public int VehicleCount { get; set; }
    public int InteractionCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
