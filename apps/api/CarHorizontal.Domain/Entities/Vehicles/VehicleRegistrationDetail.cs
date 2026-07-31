using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Vehicles;

/// <summary>
/// Données du certificat d'immatriculation français (carte grise), une ligne par
/// véhicule. Les noms de propriétés reprennent les <b>repères</b> officiels du
/// document (A, B, D.2, P.6…) rappelés dans les commentaires : c'est ce que le
/// garagiste lit sur la carte grise, et c'est ce que réclament les formulaires
/// Cerfa 13750 (demande d'immatriculation) et 15776 (certificat de cession).
///
/// Séparé de <c>Vehicle</c> parce que ces ~30 colonnes ne servent qu'à la vente et
/// aux démarches administratives, alors que <c>Vehicle</c> est lu sur tous les
/// écrans atelier. Les repères A (plaque), D.1 (marque) et E (VIN) ne sont pas
/// dupliqués ici : ils vivent déjà sur <c>Vehicle</c>.
/// </summary>
public class VehicleRegistrationDetail : OrganizationEntityBase
{
    public Guid VehicleId { get; set; }

    /// <summary>Repère B — date de première immatriculation du véhicule.</summary>
    public DateTime? FirstRegisteredAt { get; set; }

    /// <summary>Repère I — date d'immatriculation du certificat courant.</summary>
    public DateTime? CertificateIssuedAt { get; set; }

    /// <summary>Repère C.1 — nom et prénom du titulaire.</summary>
    public string? HolderName { get; set; }

    /// <summary>Repère C.3 — adresse du titulaire.</summary>
    public string? HolderAddress { get; set; }

    /// <summary>Repère D.2 — type, variante, version (TVV).</summary>
    public string? TypeVariantVersion { get; set; }

    /// <summary>Repère D.2.1 — type national (« type mines »).</summary>
    public string? NationalTypeCode { get; set; }

    /// <summary>Repère D.3 — dénomination commerciale.</summary>
    public string? CommercialName { get; set; }

    /// <summary>Repère K — numéro de réception par type.</summary>
    public string? TypeApprovalNumber { get; set; }

    /// <summary>Repère J — catégorie communautaire (M1, N1…).</summary>
    public string? EuCategory { get; set; }

    /// <summary>Repère J.1 — genre national (VP, CTTE, MTT1…).</summary>
    public string? NationalGenre { get; set; }

    /// <summary>Repère J.2 — carrosserie communautaire (AA, AB…).</summary>
    public string? EuBodyType { get; set; }

    /// <summary>Repère J.3 — carrosserie nationale (BERLINE, BREAK, CI…).</summary>
    public string? NationalBodyType { get; set; }

    /// <summary>Repère F.1 — masse en charge maximale techniquement admissible (kg).</summary>
    public int? TechnicallyPermissibleMaxMassKg { get; set; }

    /// <summary>Repère F.2 — masse en charge maximale admise en service (kg).</summary>
    public int? MaxMassInServiceKg { get; set; }

    /// <summary>Repère F.3 — masse en charge maximale de l'ensemble en service (kg).</summary>
    public int? MaxTrainMassKg { get; set; }

    /// <summary>Repère G — masse du véhicule en service (kg).</summary>
    public int? MassInServiceKg { get; set; }

    /// <summary>Repère G.1 — poids à vide national (kg).</summary>
    public int? NationalEmptyMassKg { get; set; }

    /// <summary>Repère P.1 — cylindrée (cm³).</summary>
    public int? EngineDisplacementCm3 { get; set; }

    /// <summary>Repère P.2 — puissance nette maximale (kW).</summary>
    public decimal? MaxNetPowerKw { get; set; }

    /// <summary>Repère P.3 — code carburant (ES, GO, EE, EH, GP…).</summary>
    public string? FuelCode { get; set; }

    /// <summary>Repère P.6 — puissance administrative nationale (chevaux fiscaux).</summary>
    public int? FiscalHorsepower { get; set; }

    /// <summary>Repère Q — rapport puissance/masse (kW/kg), renseigné pour les 2-roues.</summary>
    public decimal? PowerToMassRatio { get; set; }

    /// <summary>Repère S.1 — nombre de places assises.</summary>
    public int? SeatingCapacity { get; set; }

    /// <summary>Repère S.2 — nombre de places debout.</summary>
    public int? StandingCapacity { get; set; }

    /// <summary>Repère U.1 — niveau sonore à l'arrêt (dB(A)).</summary>
    public int? SoundLevelDb { get; set; }

    /// <summary>Repère U.2 — régime moteur associé au niveau sonore (min⁻¹).</summary>
    public int? EngineSpeedRpm { get; set; }

    /// <summary>Repère V.7 — émissions de CO₂ (g/km).</summary>
    public int? Co2GramsPerKm { get; set; }

    /// <summary>Repère V.9 — classe environnementale de réception CE (norme Euro).</summary>
    public string? EmissionClass { get; set; }

    /// <summary>Repère X.1 — date du dernier contrôle technique.</summary>
    public DateTime? LastTechnicalInspectionAt { get; set; }

    /// <summary>
    /// Fin de validité du contrôle technique. Pas un repère de la carte grise, mais
    /// l'information que le vendeur doit surveiller : à la cession, le CT doit dater
    /// de moins de 6 mois pour un véhicule de plus de 4 ans.
    /// </summary>
    public DateTime? TechnicalInspectionValidUntil { get; set; }

    /// <summary>Numéro de formule du certificat, exigé pour toute démarche ANTS.</summary>
    public string? CertificateFormulaNumber { get; set; }
}
