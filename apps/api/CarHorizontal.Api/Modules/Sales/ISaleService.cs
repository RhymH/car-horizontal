using CarHorizontal.Api.Modules.Sales.Dtos;
using CarHorizontal.Domain.Files;

namespace CarHorizontal.Api.Modules.Sales;

/// <summary>Un fichier reçu du client, découplé des types ASP.NET.</summary>
public sealed record PhotoUpload(string FileName, string ContentType, byte[] Content);

/// <summary>Contenu prêt à être renvoyé en téléchargement.</summary>
public sealed record ExportedDossier(string FileName, string Text);

public interface ISaleService
{
    /// <summary>Vue complète du dossier de vente d'un véhicule (listing null si non ouvert).</summary>
    Task<SaleDossierDto> GetDossierAsync(Guid vehicleId, CancellationToken ct = default);

    /// <summary>Stock commercial : un item par dossier de vente.</summary>
    Task<SaleListingsListResponseDto> ListAsync(SaleListingsListRequestDto request, CancellationToken ct = default);

    /// <summary>Crée le dossier au premier appel, le met à jour ensuite.</summary>
    Task<SaleDossierDto> UpsertListingAsync(Guid vehicleId, UpsertSaleListingRequestDto request, CancellationToken ct = default);

    /// <summary>Supprime le dossier et tout ce qui s'y rattache (photos comprises).</summary>
    Task DeleteListingAsync(Guid vehicleId, CancellationToken ct = default);

    /// <summary>Change le prix affiché en écrivant une ligne d'historique.</summary>
    Task<SaleDossierDto> ChangePriceAsync(Guid vehicleId, ChangeSalePriceRequestDto request, CancellationToken ct = default);

    Task<SaleDossierDto> AddChannelPostAsync(Guid vehicleId, UpsertChannelPostRequestDto request, CancellationToken ct = default);
    Task<SaleDossierDto> UpdateChannelPostAsync(Guid postId, UpsertChannelPostRequestDto request, CancellationToken ct = default);
    Task<SaleDossierDto> DeleteChannelPostAsync(Guid postId, CancellationToken ct = default);

    /// <summary>Compresse puis stocke les images fournies, et les ajoute à la galerie.</summary>
    Task<SaleDossierDto> AddPhotosAsync(Guid vehicleId, IReadOnlyList<PhotoUpload> uploads, CancellationToken ct = default);

    Task<SaleDossierDto> UpdatePhotoAsync(Guid photoId, UpdateSalePhotoRequestDto request, CancellationToken ct = default);
    Task<SaleDossierDto> ReorderPhotosAsync(Guid vehicleId, ReorderSalePhotosRequestDto request, CancellationToken ct = default);
    Task<SaleDossierDto> DeletePhotoAsync(Guid photoId, CancellationToken ct = default);

    /// <summary>Binaire d'une photo. <paramref name="thumbnail"/> sert la vignette.</summary>
    Task<FileContent?> GetPhotoContentAsync(Guid photoId, bool thumbnail, CancellationToken ct = default);

    /// <summary>Compose une planche JPEG à partir des photos du dossier.</summary>
    Task<ProcessedImage> BuildMosaicAsync(Guid vehicleId, BuildMosaicRequestDto request, CancellationToken ct = default);

    Task<SaleDossierDto> AddInquiryAsync(Guid vehicleId, UpsertInquiryRequestDto request, CancellationToken ct = default);
    Task<SaleDossierDto> UpdateInquiryAsync(Guid inquiryId, UpsertInquiryRequestDto request, CancellationToken ct = default);
    Task<SaleDossierDto> DeleteInquiryAsync(Guid inquiryId, CancellationToken ct = default);

    /// <summary>Contacts acheteurs d'un client, vus depuis sa fiche.</summary>
    Task<CustomerSaleInquiriesResponseDto> ListCustomerInquiriesAsync(
        Guid customerId,
        CancellationToken ct = default);

    /// <summary>Enregistre les données de carte grise du véhicule.</summary>
    Task<SaleDossierDto> UpsertRegistrationAsync(Guid vehicleId, UpsertRegistrationRequestDto request, CancellationToken ct = default);

    /// <summary>
    /// Produit le récapitulatif texte du dossier — véhicule, carte grise, prix,
    /// annonces — à joindre à une demande d'immatriculation ou à un acheteur.
    /// <paramref name="includeInternal"/> ajoute les montants confidentiels (prix
    /// d'achat, plancher, marge, notes internes) : à réserver à un usage interne,
    /// d'où le choix de les exclure par défaut.
    /// </summary>
    Task<ExportedDossier> ExportAsync(
        Guid vehicleId,
        bool includeInternal = false,
        CancellationToken ct = default);
}
