namespace CarHorizontal.Api.Modules.Leads.Dtos;

/// <summary>Full (PUT) update of a lead profile; creates it when missing.</summary>
public class UpdateLeadRequestDto
{
    public string Stage { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string? SourceDetail { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? InterestSummary { get; set; }
    public string? LostReason { get; set; }
}
