namespace CarHorizontal.Api.Modules.Leads.Dtos;

public class LeadsListResponseDto
{
    public List<LeadListItemDto> Items { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }

    /// <summary>Number of leads (in the unfiltered open pipeline) whose follow-up is overdue.</summary>
    public int OverdueCount { get; set; }
}

public class LeadListItemDto
{
    public Guid CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string[] Tags { get; set; } = Array.Empty<string>();

    public string Stage { get; set; } = string.Empty;
    public DateTime StageChangedAt { get; set; }
    public string Source { get; set; } = string.Empty;
    public string? SourceDetail { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? AssignedToName { get; set; }
    public string? InterestSummary { get; set; }

    public DateTime? NextFollowUpAt { get; set; }
    public DateTime? LastInteractionAt { get; set; }
    public int VehicleCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
