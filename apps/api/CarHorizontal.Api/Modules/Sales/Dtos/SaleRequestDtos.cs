namespace CarHorizontal.Api.Modules.Sales.Dtos;

/// <summary>
/// Ouvre ou met à jour le dossier de vente d'un véhicule. Sémantique PATCH : un
/// champ absent (null) est laissé inchangé. <see cref="AskingPrice"/> est traité à
/// part — le changer écrit une ligne d'historique.
/// </summary>
public class UpsertSaleListingRequestDto
{
    public string? Status { get; set; }

    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Equipment { get; set; }
    public string? InternalNotes { get; set; }

    public decimal? AskingPrice { get; set; }
    public decimal? FloorPrice { get; set; }
    public decimal? PurchasePrice { get; set; }
    public decimal? ReconditioningCost { get; set; }
    public bool? IsPriceNegotiable { get; set; }

    public decimal? SoldPrice { get; set; }
    public DateTime? SoldAt { get; set; }
    public Guid? SoldToCustomerId { get; set; }
    public string? BuyerName { get; set; }
    public DateTime? ListedAt { get; set; }

    public string? Origin { get; set; }
    public int? OwnersCount { get; set; }
    public bool? HasServiceBook { get; set; }
    public bool? HasRegistrationCertificate { get; set; }
    public DateTime? NonPledgeCertificateAt { get; set; }
    public int? KeysCount { get; set; }
    public int? WarrantyMonths { get; set; }
    public bool? IsDamagedHistory { get; set; }
}

/// <summary>Changement de prix affiché, historisé avec son motif.</summary>
public class ChangeSalePriceRequestDto
{
    public decimal Price { get; set; }
    public string? Reason { get; set; }
}

public class UpsertChannelPostRequestDto
{
    public string Channel { get; set; } = string.Empty;
    public string? Url { get; set; }
    public string? ExternalReference { get; set; }
    public string? Status { get; set; }
    public DateTime? PublishedAt { get; set; }
    public decimal? DisplayedPrice { get; set; }
    public string? Notes { get; set; }
}

/// <summary>Identité d'un acheteur qui n'a pas encore de fiche client.</summary>
public class NewBuyerDto
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
}

/// <summary>
/// Création ou mise à jour d'un contact acheteur. Le contact est rattaché à une
/// fiche client : soit <see cref="CustomerId"/> désigne une fiche existante, soit
/// <see cref="NewBuyer"/> décrit l'acheteur et la fiche est créée (ou retrouvée si
/// le téléphone/e-mail correspond déjà à un client connu). En édition, les deux
/// peuvent rester nuls : le rattachement existant est conservé.
/// </summary>
public class UpsertInquiryRequestDto
{
    public Guid? CustomerId { get; set; }
    public NewBuyerDto? NewBuyer { get; set; }

    public string? Channel { get; set; }
    public string? Status { get; set; }
    public DateTime? ReceivedAt { get; set; }
    public decimal? OfferAmount { get; set; }
    public DateTime? TestDriveAt { get; set; }
    public DateTime? NextFollowUpAt { get; set; }
    public string? LostReason { get; set; }
    public string? Notes { get; set; }
}

/// <summary>Métadonnées éditables d'une photo déjà stockée.</summary>
public class UpdateSalePhotoRequestDto
{
    public string? Caption { get; set; }
    public bool? IsPrimary { get; set; }
}

/// <summary>Nouvel ordre complet de la galerie : les identifiants absents gardent leur rang.</summary>
public class ReorderSalePhotosRequestDto
{
    public IReadOnlyList<Guid> PhotoIds { get; set; } = Array.Empty<Guid>();
}

/// <summary>
/// Paramètres de composition d'une planche de photos. Sert à publier une annonce
/// riche sur un site qui limite le nombre de visuels : quatre photos deviennent
/// une seule image.
/// </summary>
public class BuildMosaicRequestDto
{
    /// <summary>Photos à composer, dans l'ordre de lecture (gauche→droite, haut→bas).</summary>
    public IReadOnlyList<Guid> PhotoIds { get; set; } = Array.Empty<Guid>();

    public int Columns { get; set; } = 2;
    public int Rows { get; set; } = 2;

    /// <summary>Côté d'une cellule en pixels.</summary>
    public int CellSize { get; set; } = 800;

    /// <summary>Épaisseur du liseré entre les photos, en pixels.</summary>
    public int Gap { get; set; } = 8;

    /// <summary>Couleur de fond au format #RRGGBB.</summary>
    public string Background { get; set; } = "#FFFFFF";

    public int Quality { get; set; } = 82;
}

/// <summary>Saisie des données de carte grise. Sémantique de remplacement complet.</summary>
public class UpsertRegistrationRequestDto
{
    public DateTime? FirstRegisteredAt { get; set; }
    public DateTime? CertificateIssuedAt { get; set; }
    public string? CertificateFormulaNumber { get; set; }

    public string? HolderName { get; set; }
    public string? HolderAddress { get; set; }

    public string? TypeVariantVersion { get; set; }
    public string? NationalTypeCode { get; set; }
    public string? CommercialName { get; set; }
    public string? TypeApprovalNumber { get; set; }

    public string? EuCategory { get; set; }
    public string? NationalGenre { get; set; }
    public string? EuBodyType { get; set; }
    public string? NationalBodyType { get; set; }

    public int? TechnicallyPermissibleMaxMassKg { get; set; }
    public int? MaxMassInServiceKg { get; set; }
    public int? MaxTrainMassKg { get; set; }
    public int? MassInServiceKg { get; set; }
    public int? NationalEmptyMassKg { get; set; }

    public int? EngineDisplacementCm3 { get; set; }
    public decimal? MaxNetPowerKw { get; set; }
    public string? FuelCode { get; set; }
    public int? FiscalHorsepower { get; set; }
    public decimal? PowerToMassRatio { get; set; }

    public int? SeatingCapacity { get; set; }
    public int? StandingCapacity { get; set; }

    public int? SoundLevelDb { get; set; }
    public int? EngineSpeedRpm { get; set; }

    public int? Co2GramsPerKm { get; set; }
    public string? EmissionClass { get; set; }

    public DateTime? LastTechnicalInspectionAt { get; set; }
    public DateTime? TechnicalInspectionValidUntil { get; set; }
}

/// <summary>Filtres de la vue « stock à vendre ».</summary>
public class SaleListingsListRequestDto
{
    public string? Search { get; set; }

    /// <summary>Statut unique, ou « All ». Par défaut : les dossiers non clôturés.</summary>
    public string? Status { get; set; }

    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}

public class SaleListingsListResponseDto
{
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public IReadOnlyList<SaleListingListItemDto> Items { get; set; } = Array.Empty<SaleListingListItemDto>();
}

public class SaleListingListItemDto
{
    public Guid Id { get; set; }
    public Guid VehicleId { get; set; }
    public string VehicleLabel { get; set; } = string.Empty;
    public string? LicensePlate { get; set; }
    public int? Year { get; set; }
    public int CurrentMileage { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal? AskingPrice { get; set; }
    public decimal? EstimatedMargin { get; set; }
    public int? DaysInStock { get; set; }
    public int PhotoCount { get; set; }
    public int OpenInquiryCount { get; set; }
    public Guid? PrimaryPhotoId { get; set; }
    public DateTime? ListedAt { get; set; }
}
