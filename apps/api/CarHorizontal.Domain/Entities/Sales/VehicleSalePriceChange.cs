using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Sales;

/// <summary>
/// Une ligne d'historique de prix. Écrite automatiquement à chaque changement de
/// <see cref="VehicleSaleListing.AskingPrice"/> : c'est la source de vérité de la
/// courbe « évolution du prix » et du délai avant première baisse.
/// </summary>
public class VehicleSalePriceChange : OrganizationEntityBase
{
    public Guid ListingId { get; set; }

    /// <summary>Dupliqué depuis le listing pour interroger l'historique par véhicule sans jointure.</summary>
    public Guid VehicleId { get; set; }

    /// <summary>Nouveau prix affiché.</summary>
    public decimal Price { get; set; }

    /// <summary>Prix précédent — null pour la mise en vente initiale.</summary>
    public decimal? PreviousPrice { get; set; }

    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Motif saisi par le vendeur (« pas d'appel en 3 semaines », « alignement concurrence »).</summary>
    public string? Reason { get; set; }
}
