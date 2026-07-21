namespace CarHorizontal.Api.Modules.Leads.Dtos;

public class CompleteLeadFollowUpRequestDto
{
    /// <summary>
    /// When provided, an interaction is logged on the customer with the
    /// follow-up's channel and this summary.
    /// </summary>
    public string? InteractionSummary { get; set; }
}
