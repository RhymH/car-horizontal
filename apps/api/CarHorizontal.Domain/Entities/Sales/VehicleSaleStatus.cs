namespace CarHorizontal.Domain.Entities.Sales;

/// <summary>
/// Cycle de vie commercial d'un véhicule mis en vente. L'ordre des membres est
/// utilisé pour trier le stock (les dossiers actifs d'abord) — ne pas réordonner
/// sans migrer les données existantes.
/// </summary>
public enum VehicleSaleStatus
{
    /// <summary>Dossier en préparation : photos/prix pas encore prêts à publier.</summary>
    Draft = 0,

    /// <summary>Publié : le véhicule est activement proposé à la vente.</summary>
    ForSale = 1,

    /// <summary>Réservé par un acheteur (arrhes versées, en attente de finalisation).</summary>
    Reserved = 2,

    /// <summary>Vendu et livré.</summary>
    Sold = 3,

    /// <summary>Retiré de la vente (repris par le propriétaire, invendable, etc.).</summary>
    Withdrawn = 4
}
