using CarHorizontal.Domain.Common;
using CarHorizontal.Domain.Entities.Customers;

namespace CarHorizontal.Domain.Entities.Leads;

/// <summary>
/// A scheduled follow-up ("relance") on a prospect: who must reach out, when,
/// through which channel, and what to say. Completing one is expected to log a
/// CustomerInteraction and (usually) schedule the next follow-up.
/// </summary>
public class LeadFollowUp : OrganizationEntityBase
{
    public Guid CustomerId { get; set; }

    public DateTime DueAt { get; set; }

    /// <summary>Channel to use for the follow-up (reuses the interaction types).</summary>
    public CustomerInteractionType Channel { get; set; } = CustomerInteractionType.Call;

    /// <summary>What this follow-up is about / talking points.</summary>
    public string? Note { get; set; }

    public LeadFollowUpStatus Status { get; set; } = LeadFollowUpStatus.Pending;

    public Guid? AssignedToUserId { get; set; }

    public DateTime? CompletedAt { get; set; }
    public Guid? CompletedByUserId { get; set; }
}
