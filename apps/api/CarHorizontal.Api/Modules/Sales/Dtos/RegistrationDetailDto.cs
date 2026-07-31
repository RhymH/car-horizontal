namespace CarHorizontal.Api.Modules.Sales.Dtos;

/// <summary>
/// Données de carte grise d'un véhicule. Les commentaires rappellent le repère
/// officiel du certificat pour que le portal puisse l'afficher à côté du champ —
/// le garagiste recopie alors ligne à ligne sans se tromper.
/// </summary>
public class RegistrationDetailDto
{
    public Guid VehicleId { get; set; }

    public DateTime? FirstRegisteredAt { get; set; }          // B
    public DateTime? CertificateIssuedAt { get; set; }        // I
    public string? CertificateFormulaNumber { get; set; }

    public string? HolderName { get; set; }                   // C.1
    public string? HolderAddress { get; set; }                // C.3

    public string? TypeVariantVersion { get; set; }           // D.2
    public string? NationalTypeCode { get; set; }             // D.2.1
    public string? CommercialName { get; set; }               // D.3
    public string? TypeApprovalNumber { get; set; }           // K

    public string? EuCategory { get; set; }                   // J
    public string? NationalGenre { get; set; }                // J.1
    public string? EuBodyType { get; set; }                   // J.2
    public string? NationalBodyType { get; set; }             // J.3

    public int? TechnicallyPermissibleMaxMassKg { get; set; } // F.1
    public int? MaxMassInServiceKg { get; set; }              // F.2
    public int? MaxTrainMassKg { get; set; }                  // F.3
    public int? MassInServiceKg { get; set; }                 // G
    public int? NationalEmptyMassKg { get; set; }             // G.1

    public int? EngineDisplacementCm3 { get; set; }           // P.1
    public decimal? MaxNetPowerKw { get; set; }               // P.2
    public string? FuelCode { get; set; }                     // P.3
    public int? FiscalHorsepower { get; set; }                // P.6
    public decimal? PowerToMassRatio { get; set; }            // Q

    public int? SeatingCapacity { get; set; }                 // S.1
    public int? StandingCapacity { get; set; }                // S.2

    public int? SoundLevelDb { get; set; }                    // U.1
    public int? EngineSpeedRpm { get; set; }                  // U.2

    public int? Co2GramsPerKm { get; set; }                   // V.7
    public string? EmissionClass { get; set; }                // V.9

    public DateTime? LastTechnicalInspectionAt { get; set; }  // X.1
    public DateTime? TechnicalInspectionValidUntil { get; set; }

    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// État de complétude du dossier d'immatriculation — alimente l'encart d'aide
/// « il manque encore… » sur la fiche véhicule.
/// </summary>
public class RegistrationReadinessDto
{
    /// <summary>Pourcentage de champs renseignés, bloquants et recommandés confondus.</summary>
    public int CompletionPercent { get; set; }

    /// <summary>Vrai quand plus aucun champ bloquant ne manque.</summary>
    public bool IsReady { get; set; }

    public int RequiredMissingCount { get; set; }
    public int RecommendedMissingCount { get; set; }

    /// <summary>Champs manquants, bloquants d'abord.</summary>
    public IReadOnlyList<RegistrationRequirementDto> Missing { get; set; } = Array.Empty<RegistrationRequirementDto>();

    /// <summary>
    /// Alerte contrôle technique : à la cession, le CT doit dater de moins de 6 mois
    /// pour un véhicule de plus de 4 ans. Null quand la date de CT est inconnue.
    /// </summary>
    public string? TechnicalInspectionWarning { get; set; }
}

public class RegistrationRequirementDto
{
    public string Field { get; set; } = string.Empty;

    /// <summary>Repère sur la carte grise (« D.2 », « P.6 »…), null si hors document.</summary>
    public string? Marker { get; set; }

    public string Label { get; set; } = string.Empty;

    /// <summary>« Required » ou « Recommended ».</summary>
    public string Level { get; set; } = string.Empty;
}
