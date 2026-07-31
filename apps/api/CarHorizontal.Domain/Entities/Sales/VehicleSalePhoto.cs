using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Sales;

/// <summary>
/// Photo d'un dossier de vente. Le binaire vit dans <c>StoredFile</c> (en base pour
/// le MVP) ; cette table ne porte que le classement et les métadonnées d'affichage.
/// Chaque upload produit deux fichiers : une version compressée pour l'annonce et
/// une vignette pour la galerie.
/// </summary>
public class VehicleSalePhoto : OrganizationEntityBase
{
    public Guid ListingId { get; set; }
    public Guid VehicleId { get; set; }

    /// <summary>Image recompressée (JPEG) servie en pleine taille.</summary>
    public Guid StoredFileId { get; set; }

    /// <summary>Vignette JPEG servie dans les listes et la galerie.</summary>
    public Guid ThumbnailFileId { get; set; }

    /// <summary>Position dans la galerie ; la photo 0 est celle de l'annonce.</summary>
    public int SortOrder { get; set; }

    public string? Caption { get; set; }

    /// <summary>Photo mise en avant (vignette du véhicule dans les listes).</summary>
    public bool IsPrimary { get; set; }

    public int Width { get; set; }
    public int Height { get; set; }

    /// <summary>Poids après recompression.</summary>
    public long SizeBytes { get; set; }

    /// <summary>Poids du fichier d'origine — sert à afficher l'espace économisé.</summary>
    public long OriginalSizeBytes { get; set; }

    public string OriginalFileName { get; set; } = string.Empty;
}
