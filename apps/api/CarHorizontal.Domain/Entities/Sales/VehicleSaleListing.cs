using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Sales;

/// <summary>
/// Dossier de vente d'un véhicule : un seul par véhicule (relation 1↔1). Porte tout
/// ce qui est spécifique à la commercialisation — prix, marge, texte d'annonce,
/// documents — là où <c>Vehicle</c> reste la fiche technique/atelier partagée avec
/// l'entretien.
/// </summary>
public class VehicleSaleListing : OrganizationEntityBase
{
    public Guid VehicleId { get; set; }

    public VehicleSaleStatus Status { get; set; } = VehicleSaleStatus.Draft;

    // --- Annonce -------------------------------------------------------

    /// <summary>Titre de l'annonce publiée (réutilisé pour l'export vers les sites).</summary>
    public string? Title { get; set; }

    /// <summary>Corps de l'annonce (description commerciale).</summary>
    public string? Description { get; set; }

    /// <summary>Équipements et options, une ligne par élément.</summary>
    public string? Equipment { get; set; }

    /// <summary>Notes internes — jamais exportées dans une annonce.</summary>
    public string? InternalNotes { get; set; }

    // --- Prix ----------------------------------------------------------

    /// <summary>Prix affiché. Toute modification est historisée dans <see cref="VehicleSalePriceChange"/>.</summary>
    public decimal? AskingPrice { get; set; }

    /// <summary>Prix plancher accepté par le garage. Interne, jamais exposé dans une annonce.</summary>
    public decimal? FloorPrice { get; set; }

    /// <summary>Prix d'achat / valeur de reprise — base du calcul de marge.</summary>
    public decimal? PurchasePrice { get; set; }

    /// <summary>Coût de remise en état (mécanique, carrosserie, esthétique).</summary>
    public decimal? ReconditioningCost { get; set; }

    public bool IsPriceNegotiable { get; set; } = true;

    // --- Issue de la vente ---------------------------------------------

    public decimal? SoldPrice { get; set; }
    public DateTime? SoldAt { get; set; }

    /// <summary>Acheteur, quand il a été créé en tant que client de l'organisation.</summary>
    public Guid? SoldToCustomerId { get; set; }

    /// <summary>Nom de l'acheteur quand aucune fiche client n'a été créée.</summary>
    public string? BuyerName { get; set; }

    /// <summary>Date de mise en vente — sert au calcul du nombre de jours en stock.</summary>
    public DateTime? ListedAt { get; set; }

    // --- Historique et provenance --------------------------------------

    /// <summary>Origine du véhicule : reprise, achat pro, mandat, succession…</summary>
    public string? Origin { get; set; }

    /// <summary>Nombre de propriétaires précédents (argument de vente courant).</summary>
    public int? OwnersCount { get; set; }

    /// <summary>Carnet d'entretien présent et à jour.</summary>
    public bool HasServiceBook { get; set; }

    /// <summary>Carte grise disponible et au nom du vendeur (bloquant pour la cession).</summary>
    public bool HasRegistrationCertificate { get; set; }

    /// <summary>Certificat de situation administrative (non-gage) obtenu — valable 15 jours.</summary>
    public DateTime? NonPledgeCertificateAt { get; set; }

    /// <summary>Nombre de clés remises avec le véhicule.</summary>
    public int? KeysCount { get; set; }

    /// <summary>Garantie commerciale proposée, en mois.</summary>
    public int? WarrantyMonths { get; set; }

    /// <summary>Véhicule accidenté / réparé, à déclarer à l'acheteur.</summary>
    public bool IsDamagedHistory { get; set; }
}
