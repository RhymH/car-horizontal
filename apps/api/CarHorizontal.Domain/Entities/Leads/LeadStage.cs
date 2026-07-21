namespace CarHorizontal.Domain.Entities.Leads;

/// <summary>
/// Position of a prospect in the sales pipeline. Linear funnel with two
/// terminal outcomes (Won / Lost).
/// </summary>
public enum LeadStage
{
    /// <summary>Fresh lead, nobody reached out yet.</summary>
    New = 0,

    /// <summary>At least one outbound contact happened.</summary>
    Contacted = 1,

    /// <summary>Need and intent confirmed (budget, vehicle, timing).</summary>
    Qualified = 2,

    /// <summary>An appointment (visit, test drive, estimate) is booked.</summary>
    AppointmentScheduled = 3,

    /// <summary>Converted into an active customer of the garage.</summary>
    Won = 4,

    /// <summary>Dropped out of the funnel (see LostReason).</summary>
    Lost = 5
}
