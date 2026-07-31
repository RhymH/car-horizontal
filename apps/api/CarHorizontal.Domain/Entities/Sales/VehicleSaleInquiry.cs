using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Sales;

/// <summary>Par où le contact acheteur est arrivé.</summary>
public enum SaleInquiryChannel
{
    Phone = 0,
    Email = 1,
    Sms = 2,
    /// <summary>Message reçu via la messagerie d'un site d'annonces.</summary>
    Marketplace = 3,
    /// <summary>Visite spontanée au garage.</summary>
    WalkIn = 4,
    Referral = 5,
    Other = 6
}

/// <summary>Avancement d'un contact acheteur dans le tunnel de vente.</summary>
public enum SaleInquiryStatus
{
    New = 0,
    Contacted = 1,
    TestDriveScheduled = 2,
    OfferMade = 3,
    Negotiating = 4,
    Won = 5,
    Lost = 6
}

/// <summary>
/// Contact acheteur sur un véhicule : c'est la partie « prospection » du dossier.
/// Le pivot est le véhicule — un même acheteur peut apparaître sur plusieurs
/// véhicules — mais l'identité vit toujours sur le <c>Customer</c> lié, jamais ici :
/// nom, téléphone et e-mail ne sont donc pas dupliqués sur cette table. Le couple
/// <c>Customer</c> + <c>LeadProfile</c> reste la source de vérité du contact, ce qui
/// rend l'acheteur visible dans le pipeline prospects comme n'importe quel lead.
/// </summary>
public class VehicleSaleInquiry : OrganizationEntityBase
{
    public Guid ListingId { get; set; }
    public Guid VehicleId { get; set; }

    /// <summary>
    /// Fiche client de l'acheteur. Obligatoire : un contact acheteur sans fiche
    /// serait une donnée orpheline, invisible depuis la prospection.
    /// </summary>
    public Guid CustomerId { get; set; }

    public SaleInquiryChannel Channel { get; set; } = SaleInquiryChannel.Phone;
    public SaleInquiryStatus Status { get; set; } = SaleInquiryStatus.New;

    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Montant proposé par l'acheteur — alimente l'écart avec le prix plancher.</summary>
    public decimal? OfferAmount { get; set; }

    public DateTime? TestDriveAt { get; set; }
    public DateTime? NextFollowUpAt { get; set; }

    /// <summary>Motif de perte, saisi quand le statut passe à <see cref="SaleInquiryStatus.Lost"/>.</summary>
    public string? LostReason { get; set; }

    public string? Notes { get; set; }
}
