namespace CarHorizontal.Api.Modules.Leads.Dtos;

public class CreateLeadFollowUpRequestDto
{
    public DateTime DueAt { get; set; }

    /// <summary>CustomerInteractionType name: Call, Sms, Email, Visit, Note.</summary>
    public string Channel { get; set; } = "Call";

    public string? Note { get; set; }
    public Guid? AssignedToUserId { get; set; }
}
