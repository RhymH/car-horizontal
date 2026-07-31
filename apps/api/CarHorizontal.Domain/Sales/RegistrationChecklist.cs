using CarHorizontal.Domain.Entities.Vehicles;

namespace CarHorizontal.Domain.Sales;

/// <summary>Importance d'une information manquante dans le dossier d'immatriculation.</summary>
public enum RegistrationRequirementLevel
{
    /// <summary>La démarche ANTS est impossible sans cette information.</summary>
    Required = 0,

    /// <summary>Réclamé dans la plupart des cas ; à défaut, la demande peut être rejetée.</summary>
    Recommended = 1
}

/// <summary>Une information attendue et son état de remplissage.</summary>
/// <param name="Field">Clé stable, utilisée par le front pour cibler le champ du formulaire.</param>
/// <param name="Marker">Repère officiel sur la carte grise (« D.2 », « P.6 »…), null si hors document.</param>
/// <param name="Label">Libellé lisible affiché dans l'encart d'aide.</param>
/// <param name="Level">Bloquant ou recommandé.</param>
/// <param name="IsFilled">Vrai quand la donnée est présente.</param>
public sealed record RegistrationRequirement(
    string Field,
    string? Marker,
    string Label,
    RegistrationRequirementLevel Level,
    bool IsFilled);

/// <summary>
/// Calcule ce qu'il manque pour constituer un dossier d'immatriculation (Cerfa 13750)
/// ou de cession (Cerfa 15776). La liste vit dans le Domain — c'est une règle métier
/// française, pas une préoccupation d'affichage — et alimente à la fois l'encart
/// d'aide de la fiche véhicule et l'export du dossier.
/// </summary>
public static class RegistrationChecklist
{
    /// <summary>
    /// Évalue le dossier. <paramref name="detail"/> peut être null (aucune donnée de
    /// carte grise saisie) : tous les repères ressortent alors comme manquants.
    /// </summary>
    public static IReadOnlyList<RegistrationRequirement> Evaluate(
        Vehicle vehicle,
        VehicleRegistrationDetail? detail)
    {
        static bool Text(string? v) => !string.IsNullOrWhiteSpace(v);

        return new List<RegistrationRequirement>
        {
            // --- Identification du véhicule (bloquants) --------------------
            new("licensePlate", "A", "Numéro d'immatriculation",
                RegistrationRequirementLevel.Required, Text(vehicle.LicensePlate)),
            new("vin", "E", "Numéro d'identification (VIN)",
                RegistrationRequirementLevel.Required, Text(vehicle.Vin)),
            new("make", "D.1", "Marque",
                RegistrationRequirementLevel.Required, Text(vehicle.Make)),
            new("firstRegisteredAt", "B", "Date de première immatriculation",
                RegistrationRequirementLevel.Required, detail?.FirstRegisteredAt is not null),
            new("certificateFormulaNumber", null, "Numéro de formule du certificat",
                RegistrationRequirementLevel.Required, Text(detail?.CertificateFormulaNumber)),

            // --- Caractéristiques techniques (bloquants) ------------------
            new("typeVariantVersion", "D.2", "Type, variante, version (TVV)",
                RegistrationRequirementLevel.Required, Text(detail?.TypeVariantVersion)),
            new("nationalTypeCode", "D.2.1", "Type national (type mines)",
                RegistrationRequirementLevel.Required, Text(detail?.NationalTypeCode)),
            new("typeApprovalNumber", "K", "Numéro de réception par type",
                RegistrationRequirementLevel.Required, Text(detail?.TypeApprovalNumber)),
            new("nationalGenre", "J.1", "Genre national (VP, CTTE…)",
                RegistrationRequirementLevel.Required, Text(detail?.NationalGenre)),
            new("fiscalHorsepower", "P.6", "Puissance administrative (CV fiscaux)",
                RegistrationRequirementLevel.Required, detail?.FiscalHorsepower is > 0),
            new("fuelCode", "P.3", "Code carburant",
                RegistrationRequirementLevel.Required, Text(detail?.FuelCode)),
            new("massInServiceKg", "G", "Masse en service",
                RegistrationRequirementLevel.Required, detail?.MassInServiceKg is > 0),
            new("technicallyPermissibleMaxMassKg", "F.1", "Masse maximale techniquement admissible",
                RegistrationRequirementLevel.Required, detail?.TechnicallyPermissibleMaxMassKg is > 0),
            new("seatingCapacity", "S.1", "Nombre de places assises",
                RegistrationRequirementLevel.Required, detail?.SeatingCapacity is > 0),

            // --- Cession / taxes (recommandés) ----------------------------
            new("holderName", "C.1", "Titulaire du certificat",
                RegistrationRequirementLevel.Recommended, Text(detail?.HolderName)),
            new("holderAddress", "C.3", "Adresse du titulaire",
                RegistrationRequirementLevel.Recommended, Text(detail?.HolderAddress)),
            new("commercialName", "D.3", "Dénomination commerciale",
                RegistrationRequirementLevel.Recommended, Text(detail?.CommercialName)),
            new("euCategory", "J", "Catégorie communautaire",
                RegistrationRequirementLevel.Recommended, Text(detail?.EuCategory)),
            new("engineDisplacementCm3", "P.1", "Cylindrée",
                RegistrationRequirementLevel.Recommended, detail?.EngineDisplacementCm3 is > 0),
            new("maxNetPowerKw", "P.2", "Puissance nette maximale (kW)",
                RegistrationRequirementLevel.Recommended, detail?.MaxNetPowerKw is > 0),
            new("co2GramsPerKm", "V.7", "Émissions de CO₂",
                RegistrationRequirementLevel.Recommended, detail?.Co2GramsPerKm is > 0),
            new("emissionClass", "V.9", "Classe environnementale (norme Euro)",
                RegistrationRequirementLevel.Recommended, Text(detail?.EmissionClass)),
            new("lastTechnicalInspectionAt", "X.1", "Date du dernier contrôle technique",
                RegistrationRequirementLevel.Recommended, detail?.LastTechnicalInspectionAt is not null),
            new("currentMileage", null, "Kilométrage au compteur",
                RegistrationRequirementLevel.Recommended, vehicle.CurrentMileage > 0),
        };
    }
}
