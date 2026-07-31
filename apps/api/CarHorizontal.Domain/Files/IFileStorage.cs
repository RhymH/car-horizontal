namespace CarHorizontal.Domain.Files;

/// <summary>Contenu binaire d'un fichier stocké, prêt à être renvoyé au client.</summary>
public sealed record FileContent(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    byte[] Content);

/// <summary>
/// Stockage de binaires. L'implémentation MVP écrit dans Postgres (colonne bytea) ;
/// l'interface est volontairement minimale pour qu'un backend objet (R2/S3) puisse
/// s'y substituer sans toucher aux appelants.
/// </summary>
public interface IFileStorage
{
    /// <summary>
    /// Enregistre un binaire dans le dossier logique <paramref name="folder"/> et
    /// renvoie son identifiant. Les contenus identiques (même SHA-256) d'une même
    /// organisation sont dédoublonnés : le fichier existant est réutilisé.
    /// </summary>
    Task<Guid> SaveAsync(
        string folder,
        string fileName,
        string contentType,
        byte[] content,
        CancellationToken ct = default);

    /// <summary>Lit un fichier, ou null s'il n'existe pas dans l'organisation courante.</summary>
    Task<FileContent?> GetAsync(Guid id, CancellationToken ct = default);

    /// <summary>Supprime (soft delete) les fichiers indiqués. Les identifiants inconnus sont ignorés.</summary>
    Task DeleteAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct = default);
}
