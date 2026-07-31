using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Sales;

/// <summary>État d'une annonce sur un site externe.</summary>
public enum SaleChannelPostStatus
{
    /// <summary>Prévue mais pas encore publiée.</summary>
    Draft = 0,

    /// <summary>En ligne et visible.</summary>
    Online = 1,

    /// <summary>Mise en pause (annonce masquée sans être supprimée).</summary>
    Paused = 2,

    /// <summary>Expirée côté site.</summary>
    Expired = 3,

    /// <summary>Retirée volontairement.</summary>
    Removed = 4
}

/// <summary>
/// Publication du véhicule sur un site d'annonces (leboncoin, La Centrale, Facebook
/// Marketplace, site du garage…). Permet de retrouver et de mettre à jour toutes
/// les annonces d'un véhicule au moment d'une baisse de prix ou de la vente.
/// </summary>
public class VehicleSaleChannelPost : OrganizationEntityBase
{
    public Guid ListingId { get; set; }
    public Guid VehicleId { get; set; }

    /// <summary>Nom du site. Texte libre : les garages utilisent des plateformes très variées.</summary>
    public string Channel { get; set; } = string.Empty;

    /// <summary>URL publique de l'annonce.</summary>
    public string? Url { get; set; }

    /// <summary>Référence de l'annonce chez le site (utile pour le support).</summary>
    public string? ExternalReference { get; set; }

    public SaleChannelPostStatus Status { get; set; } = SaleChannelPostStatus.Draft;

    public DateTime? PublishedAt { get; set; }

    /// <summary>
    /// Prix affiché sur ce site — peut différer du prix du dossier (frais de mise en
    /// relation, prix « pro » vs « particulier »). Un écart est signalé dans l'UI.
    /// </summary>
    public decimal? DisplayedPrice { get; set; }

    public string? Notes { get; set; }
}
