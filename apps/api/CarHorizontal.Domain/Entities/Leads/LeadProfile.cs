using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Leads;

/// <summary>
/// Sales-pipeline extension of a Customer. One profile per customer (per org);
/// created lazily the first time a customer is worked as a prospect. The
/// Customer row stays the single source of identity/contact data.
/// </summary>
public class LeadProfile : OrganizationEntityBase
{
    public Guid CustomerId { get; set; }

    public LeadStage Stage { get; set; } = LeadStage.New;

    /// <summary>When the stage last changed — measures pipeline velocity.</summary>
    public DateTime StageChangedAt { get; set; } = DateTime.UtcNow;

    public LeadSource Source { get; set; } = LeadSource.Unknown;

    /// <summary>Free-text detail of the source (marketplace name, referrer, campaign…).</summary>
    public string? SourceDetail { get; set; }

    /// <summary>Collaborator responsible for working this lead.</summary>
    public Guid? AssignedToUserId { get; set; }

    /// <summary>What the prospect is after: vehicle, service, budget, timing.</summary>
    public string? InterestSummary { get; set; }

    public string? LostReason { get; set; }

    /// <summary>
    /// Denormalised DueAt of the next Pending follow-up. Kept in sync by the
    /// leads service so list filtering/sorting never joins follow-ups.
    /// </summary>
    public DateTime? NextFollowUpAt { get; set; }
}
