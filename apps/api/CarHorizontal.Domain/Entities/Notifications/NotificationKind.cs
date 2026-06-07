namespace CarHorizontal.Domain.Entities.Notifications;

/// <summary>
/// Business reason a staff notification was raised. Drives icon, copy and the
/// suggested 1-click action in the portal.
/// </summary>
public enum NotificationKind
{
    /// <summary>Scheduled/overdue maintenance is approaching for a tracked vehicle.</summary>
    MaintenanceDue = 0,

    /// <summary>Technical inspection (contrôle technique) is due soon.</summary>
    InspectionDue = 1,

    /// <summary>Seasonal tyre swap window.</summary>
    TireSwapDue = 2,

    /// <summary>Vehicle reached a profile where a trade-in offer is relevant.</summary>
    TradeInOpportunity = 3,

    /// <summary>Manufacturer warranty is about to expire.</summary>
    WarrantyExpiring = 4,

    /// <summary>Customer has had no recorded activity for a long period (≈12 months).</summary>
    InactiveCustomer = 5
}
