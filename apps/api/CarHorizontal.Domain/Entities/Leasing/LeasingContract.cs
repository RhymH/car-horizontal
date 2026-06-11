using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Leasing;

/// <summary>
/// Contrat de leasing (LOA/LLD) rattaché à un véhicule et son client. Sert de
/// base à l'accompagnement leasing : échéances de fin de contrat, suivi du
/// plafond kilométrique et opportunités de renouvellement (règles Timeline).
/// Org-scoped : le filtre multitenant global s'applique automatiquement.
/// </summary>
public class LeasingContract : OrganizationEntityBase
{
    public Guid VehicleId { get; set; }

    /// <summary>Client titulaire (dénormalisé depuis le véhicule pour faciliter le scoping/les requêtes).</summary>
    public Guid CustomerId { get; set; }

    /// <summary>Organisme bailleur (ex. "DIAC", "Arval").</summary>
    public string Lessor { get; set; } = string.Empty;

    /// <summary>Référence/numéro de contrat chez le bailleur.</summary>
    public string? Reference { get; set; }

    /// <summary>Mensualité TTC.</summary>
    public decimal? MonthlyPayment { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    /// <summary>Plafond kilométrique contractuel total (sur toute la durée).</summary>
    public int? MileageCapKm { get; set; }

    /// <summary>Valeur de rachat / option d'achat en fin de contrat.</summary>
    public decimal? BuyoutValue { get; set; }

    public LeasingContractStatus Status { get; set; } = LeasingContractStatus.Active;

    public string? Notes { get; set; }
}
