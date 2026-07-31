namespace CarHorizontal.Domain.Files;

/// <summary>Image encodée, prête à être stockée ou téléchargée.</summary>
public sealed record ProcessedImage(byte[] Content, string ContentType, int Width, int Height);

/// <summary>Disposition d'une mosaïque : nombre de colonnes et de lignes de cellules.</summary>
/// <param name="Columns">Cellules par ligne.</param>
/// <param name="Rows">Nombre de lignes.</param>
public sealed record MosaicLayout(int Columns, int Rows)
{
    public int Capacity => Columns * Rows;
}

/// <summary>
/// Traitement d'images côté serveur. Deux usages : réduire le poids des photos avant
/// stockage en base, et composer plusieurs photos en une seule image — ce qui permet
/// de publier une annonce riche sur un site limitant le nombre de visuels.
/// </summary>
public interface IImageProcessor
{
    /// <summary>
    /// Ré-encode l'image en JPEG, en la redimensionnant pour que son plus grand côté
    /// ne dépasse pas <paramref name="maxDimension"/>. Les images déjà plus petites
    /// ne sont pas agrandies, mais restent recompressées pour normaliser le poids.
    /// Lève <see cref="InvalidImageException"/> si le binaire n'est pas décodable.
    /// </summary>
    ProcessedImage Compress(byte[] source, int maxDimension, int quality);

    /// <summary>
    /// Compose les images dans une grille <paramref name="layout"/> sur fond uni.
    /// Chaque cellule fait <paramref name="cellSize"/> pixels de côté ; les images
    /// sont recadrées au centre pour remplir leur cellule sans déformation. Les
    /// cellules excédentaires restent vides.
    /// </summary>
    ProcessedImage BuildMosaic(
        IReadOnlyList<byte[]> images,
        MosaicLayout layout,
        int cellSize,
        int gap,
        uint backgroundArgb,
        int quality);
}

/// <summary>Le binaire fourni n'est pas une image exploitable.</summary>
public class InvalidImageException : Exception
{
    public InvalidImageException(string message) : base(message) { }
}
