namespace CarHorizontal.Domain.Entities.Leads;

/// <summary>Acquisition channel of a prospect.</summary>
public enum LeadSource
{
    Unknown = 0,

    /// <summary>Inbound phone call.</summary>
    Phone = 1,

    /// <summary>Walked into the garage.</summary>
    WalkIn = 2,

    /// <summary>Website / contact form.</summary>
    WebForm = 3,

    /// <summary>Classified-ads marketplace (LeBonCoin, LaCentrale, …).</summary>
    Marketplace = 4,

    /// <summary>Referred by an existing customer or partner.</summary>
    Referral = 5,

    /// <summary>Bulk import of an external list.</summary>
    Import = 6,

    Other = 7
}
