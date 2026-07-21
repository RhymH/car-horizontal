namespace CarHorizontal.Api.Modules.Leads.Dtos;

public class LeadsListRequestDto
{
    public string? Search { get; set; }

    /// <summary>A LeadStage name, or "Open" for every non-terminal stage.</summary>
    public string? Stage { get; set; }

    public string? Source { get; set; }
    public Guid? AssignedToUserId { get; set; }

    /// <summary>Only leads whose next follow-up is overdue.</summary>
    public bool Overdue { get; set; }

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;

    /// <summary>nextFollowUp (default) | name | stage | lastInteraction | createdAt</summary>
    public string? SortBy { get; set; }
    public string? SortDir { get; set; }
}
