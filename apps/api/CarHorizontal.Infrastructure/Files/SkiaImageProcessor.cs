using CarHorizontal.Domain.Files;
using SkiaSharp;

namespace CarHorizontal.Infrastructure.Files;

/// <summary>
/// Traitement d'images basé sur SkiaSharp (MIT, natif multiplateforme — fonctionne
/// dans l'image Docker Linux via <c>SkiaSharp.NativeAssets.Linux.NoDependencies</c>).
/// Tout ce qui entre est ré-encodé en JPEG : c'est ce qui permet de stocker les
/// photos en base sans la faire exploser, et c'est le format attendu par les sites
/// d'annonces.
/// </summary>
public class SkiaImageProcessor : IImageProcessor
{
    public const string JpegContentType = "image/jpeg";

    public ProcessedImage Compress(byte[] source, int maxDimension, int quality)
    {
        if (maxDimension < 1) throw new ArgumentOutOfRangeException(nameof(maxDimension));
        quality = Math.Clamp(quality, 1, 100);

        using var bitmap = Decode(source);

        var scale = Math.Min(1d, (double)maxDimension / Math.Max(bitmap.Width, bitmap.Height));
        var width = Math.Max(1, (int)Math.Round(bitmap.Width * scale));
        var height = Math.Max(1, (int)Math.Round(bitmap.Height * scale));

        // Même à l'échelle 1 on ré-encode : une photo de smartphone arrive souvent en
        // JPEG qualité 100 de 8 Mo, que ce passage ramène à quelques centaines de Ko.
        using var resized = bitmap.Resize(new SKImageInfo(width, height), HighQualitySampling)
            ?? throw new InvalidImageException("Redimensionnement de l'image impossible.");

        return Encode(resized, quality);
    }

    public ProcessedImage BuildMosaic(
        IReadOnlyList<byte[]> images,
        MosaicLayout layout,
        int cellSize,
        int gap,
        uint backgroundArgb,
        int quality)
    {
        if (images.Count == 0)
            throw new InvalidImageException("Au moins une image est nécessaire pour composer une mosaïque.");
        if (layout.Columns < 1 || layout.Rows < 1)
            throw new InvalidImageException("La grille doit comporter au moins une colonne et une ligne.");
        if (cellSize < 1) throw new ArgumentOutOfRangeException(nameof(cellSize));

        gap = Math.Max(0, gap);
        quality = Math.Clamp(quality, 1, 100);

        var totalWidth = layout.Columns * cellSize + (layout.Columns + 1) * gap;
        var totalHeight = layout.Rows * cellSize + (layout.Rows + 1) * gap;

        using var surface = SKSurface.Create(new SKImageInfo(totalWidth, totalHeight, SKColorType.Rgba8888, SKAlphaType.Opaque))
            ?? throw new InvalidImageException("Création de la surface de composition impossible.");
        var canvas = surface.Canvas;
        canvas.Clear(new SKColor(backgroundArgb));

        using var paint = new SKPaint { IsAntialias = true };
        var count = Math.Min(images.Count, layout.Capacity);

        for (var i = 0; i < count; i++)
        {
            using var bitmap = Decode(images[i]);

            var col = i % layout.Columns;
            var row = i / layout.Columns;
            var x = gap + col * (cellSize + gap);
            var y = gap + row * (cellSize + gap);

            // Recadrage centré « cover » : la cellule est entièrement remplie et
            // l'image garde ses proportions — un letterbox ferait des annonces ternes.
            var side = Math.Min(bitmap.Width, bitmap.Height);
            var srcRect = new SKRect(
                (bitmap.Width - side) / 2f,
                (bitmap.Height - side) / 2f,
                (bitmap.Width + side) / 2f,
                (bitmap.Height + side) / 2f);

            canvas.DrawBitmap(bitmap, srcRect, new SKRect(x, y, x + cellSize, y + cellSize), HighQualitySampling, paint);
        }

        canvas.Flush();

        using var image = surface.Snapshot();
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, quality)
            ?? throw new InvalidImageException("Encodage de la mosaïque impossible.");

        return new ProcessedImage(data.ToArray(), JpegContentType, totalWidth, totalHeight);
    }

    private static SKSamplingOptions HighQualitySampling
        => new(SKCubicResampler.Mitchell);

    private static SKBitmap Decode(byte[] source)
    {
        if (source.Length == 0) throw new InvalidImageException("Fichier vide.");

        // SKBitmap.Decode applique déjà l'orientation EXIF via le codec : une photo
        // prise en portrait n'arrive donc pas couchée dans l'annonce.
        return SKBitmap.Decode(source)
            ?? throw new InvalidImageException("Format d'image non reconnu (JPEG, PNG, WebP ou HEIF attendus).");
    }

    private static ProcessedImage Encode(SKBitmap bitmap, int quality)
    {
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, quality)
            ?? throw new InvalidImageException("Encodage JPEG impossible.");

        return new ProcessedImage(data.ToArray(), JpegContentType, bitmap.Width, bitmap.Height);
    }
}
