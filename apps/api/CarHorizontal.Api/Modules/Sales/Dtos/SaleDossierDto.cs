namespace CarHorizontal.Api.Modules.Sales.Dtos;

/// <summary>
/// Vue agrégée du dossier de vente d'un véhicule : tout ce qu'affiche l'onglet
/// « Vente » en un seul appel (BFF), pour éviter la cascade de requêtes côté portal.
/// </summary>
public class SaleDossierDto
{
    public Guid VehicleId { get; set; }
    public string VehicleLabel { get; set; } = string.Empty;
    public string? LicensePlate { get; set; }
    public int CurrentMileage { get; set; }

    /// <summary>Null tant qu'aucun dossier de vente n'a été ouvert sur ce véhicule.</summary>
    public SaleListingDto? Listing { get; set; }

    public IReadOnlyList<SalePriceChangeDto> PriceHistory { get; set; } = Array.Empty<SalePriceChangeDto>();
    public IReadOnlyList<SaleChannelPostDto> ChannelPosts { get; set; } = Array.Empty<SaleChannelPostDto>();
    public IReadOnlyList<SalePhotoDto> Photos { get; set; } = Array.Empty<SalePhotoDto>();
    public IReadOnlyList<SaleInquiryDto> Inquiries { get; set; } = Array.Empty<SaleInquiryDto>();

    public RegistrationDetailDto? Registration { get; set; }
    public RegistrationReadinessDto RegistrationReadiness { get; set; } = new();
    public SaleMetricsDto Metrics { get; set; } = new();
}

public class SaleListingDto
{
    public Guid Id { get; set; }
    public Guid VehicleId { get; set; }
    public string Status { get; set; } = string.Empty;

    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Equipment { get; set; }
    public string? InternalNotes { get; set; }

    public decimal? AskingPrice { get; set; }
    public decimal? FloorPrice { get; set; }
    public decimal? PurchasePrice { get; set; }
    public decimal? ReconditioningCost { get; set; }
    public bool IsPriceNegotiable { get; set; }

    public decimal? SoldPrice { get; set; }
    public DateTime? SoldAt { get; set; }
    public Guid? SoldToCustomerId { get; set; }
    public string? SoldToCustomerName { get; set; }
    public string? BuyerName { get; set; }
    public DateTime? ListedAt { get; set; }

    public string? Origin { get; set; }
    public int? OwnersCount { get; set; }
    public bool HasServiceBook { get; set; }
    public bool HasRegistrationCertificate { get; set; }
    public DateTime? NonPledgeCertificateAt { get; set; }
    public int? KeysCount { get; set; }
    public int? WarrantyMonths { get; set; }
    public bool IsDamagedHistory { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class SalePriceChangeDto
{
    public Guid Id { get; set; }
    public decimal Price { get; set; }
    public decimal? PreviousPrice { get; set; }
    public DateTime ChangedAt { get; set; }
    public string? Reason { get; set; }
}

public class SaleChannelPostDto
{
    public Guid Id { get; set; }
    public string Channel { get; set; } = string.Empty;
    public string? Url { get; set; }
    public string? ExternalReference { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
    public decimal? DisplayedPrice { get; set; }
    public string? Notes { get; set; }

    /// <summary>
    /// Vrai quand le prix affiché sur le site diffère du prix du dossier : c'est le
    /// piège classique après une baisse de prix oubliée sur une plateforme.
    /// </summary>
    public bool PriceOutOfSync { get; set; }
}

public class SalePhotoDto
{
    public Guid Id { get; set; }
    public int SortOrder { get; set; }
    public string? Caption { get; set; }
    public bool IsPrimary { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public long SizeBytes { get; set; }
    public long OriginalSizeBytes { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class SaleInquiryDto
{
    public Guid Id { get; set; }

    /// <summary>Fiche client de l'acheteur — toujours renseignée.</summary>
    public Guid CustomerId { get; set; }

    // Identité recopiée depuis le Customer à la lecture : elle n'est pas stockée
    // sur le contact, donc elle suit automatiquement la fiche client.
    public string CustomerFullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }

    public string Channel { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime ReceivedAt { get; set; }
    public decimal? OfferAmount { get; set; }
    public DateTime? TestDriveAt { get; set; }
    public DateTime? NextFollowUpAt { get; set; }
    public string? LostReason { get; set; }
    public string? Notes { get; set; }
}

/// <summary>Indicateurs dérivés — jamais stockés, recalculés à chaque lecture.</summary>
public class SaleMetricsDto
{
    /// <summary>Jours écoulés depuis la mise en vente (ou depuis la vente si déjà vendu).</summary>
    public int? DaysInStock { get; set; }

    /// <summary>Prix d'achat + remise en état.</summary>
    public decimal? TotalCost { get; set; }

    /// <summary>Marge si le véhicule part au prix affiché.</summary>
    public decimal? EstimatedMargin { get; set; }

    /// <summary>Marge réellement réalisée, une fois le véhicule vendu.</summary>
    public decimal? RealizedMargin { get; set; }

    /// <summary>Écart entre le premier prix affiché et le prix courant (positif = baisse).</summary>
    public decimal? TotalPriceDrop { get; set; }

    public int PhotoCount { get; set; }

    /// <summary>Contacts encore en cours (ni gagnés, ni perdus).</summary>
    public int OpenInquiryCount { get; set; }
    public int InquiryCount { get; set; }

    /// <summary>Meilleure offre reçue, tous contacts confondus.</summary>
    public decimal? BestOffer { get; set; }

    /// <summary>Annonces actuellement en ligne.</summary>
    public int OnlinePostCount { get; set; }
}
