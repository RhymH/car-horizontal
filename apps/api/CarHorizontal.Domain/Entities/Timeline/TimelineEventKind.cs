namespace CarHorizontal.Domain.Entities.Timeline;

public enum TimelineEventKind
{
    Maintenance = 0,
    TechnicalInspection = 1,
    TireSwap = 2,
    TradeInOpportunity = 3,
    WarrantyExpiry = 4,
    Custom = 5,

    /// <summary>Fin de contrat de leasing approchante (restitution / renouvellement).</summary>
    LeaseEnd = 6,

    /// <summary>Le kilométrage projeté à l'échéance dépasse le plafond contractuel du leasing.</summary>
    MileageCapRisk = 7
}
