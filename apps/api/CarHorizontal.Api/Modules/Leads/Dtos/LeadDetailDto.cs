namespace CarHorizontal.Api.Modules.Leads.Dtos;

/// <summary>
/// Everything the "Gestion prospect" tab needs in one call: pipeline profile,
/// scheduled follow-ups and the full interaction history.
/// </summary>
public class LeadDetailDto
{
    public Guid CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;

    public string Stage { get; set; } = string.Empty;
    public DateTime StageChangedAt { get; set; }
    public string Source { get; set; } = string.Empty;
    public string? SourceDetail { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string? AssignedToName { get; set; }
    public string? InterestSummary { get; set; }
    public string? LostReason { get; set; }

    /// <summary>True when the profile row exists in DB (vs. implicit defaults).</summary>
    public bool HasProfile { get; set; }

    public List<LeadFollowUpDto> FollowUps { get; set; } = new();
    public List<LeadInteractionDto> Interactions { get; set; } = new();
}

public class LeadFollowUpDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public DateTime DueAt { get; set; }
    public string Channel { get; set; } = string.Empty;
    public string? Note { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? AssignedToUserId { get; set; }
    public string? AssignedToName { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class LeadInteractionDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public string Summary { get; set; } = string.Empty;
    public Guid AuthorUserId { get; set; }
    public string? AuthorName { get; set; }
}
