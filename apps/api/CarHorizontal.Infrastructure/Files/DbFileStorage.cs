using System.Security.Cryptography;
using CarHorizontal.Domain.Entities.Files;
using CarHorizontal.Domain.Files;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Infrastructure.Files;

/// <summary>
/// Stockage des binaires directement en base (colonne <c>bytea</c>). Choix assumé
/// pour le MVP : pas de dépendance externe, sauvegarde et multitenance héritées de
/// Postgres. Les photos sont recompressées avant d'arriver ici (voir
/// <see cref="IImageProcessor"/>), ce qui garde la table à une taille raisonnable.
/// Le passage à un stockage objet se fera en remplaçant cette implémentation.
/// </summary>
public class DbFileStorage : IFileStorage
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public DbFileStorage(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Guid> SaveAsync(
        string folder,
        string fileName,
        string contentType,
        byte[] content,
        CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Organisation active requise.");

        var sha = Convert.ToHexString(SHA256.HashData(content)).ToLowerInvariant();

        // Dédoublonnage : deux uploads du même fichier (galerie dupliquée, re-upload
        // après erreur réseau) partagent une seule ligne.
        var existing = await _db.StoredFiles.AsNoTracking()
            .Where(f => f.Sha256 == sha && f.ContentType == contentType)
            .Select(f => new { f.Id })
            .FirstOrDefaultAsync(ct);
        if (existing is not null) return existing.Id;

        var folderId = await EnsureFolderAsync(folder, orgId, ct);

        var stored = new StoredFile
        {
            OrganizationId = orgId,
            FolderId = folderId,
            OriginalFileName = Truncate(fileName, 300),
            ContentType = contentType,
            SizeBytes = content.LongLength,
            BinaryContent = content,
            Sha256 = sha
        };

        _db.StoredFiles.Add(stored);
        await _db.SaveChangesAsync(ct);
        return stored.Id;
    }

    public async Task<FileContent?> GetAsync(Guid id, CancellationToken ct = default)
    {
        // Le filtre global du DbContext borne déjà la lecture à l'organisation courante.
        var file = await _db.StoredFiles.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == id, ct);

        return file is null
            ? null
            : new FileContent(file.Id, file.OriginalFileName, file.ContentType, file.SizeBytes, file.BinaryContent);
    }

    public async Task DeleteAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct = default)
    {
        if (ids.Count == 0) return;

        var files = await _db.StoredFiles.Where(f => ids.Contains(f.Id)).ToListAsync(ct);
        if (files.Count == 0) return;

        // Remove → DeletedAt via l'intercepteur de soft delete (aucun DELETE SQL).
        _db.StoredFiles.RemoveRange(files);
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>Retrouve le dossier logique de l'organisation, en le créant au premier usage.</summary>
    private async Task<Guid> EnsureFolderAsync(string folder, Guid orgId, CancellationToken ct)
    {
        var name = string.IsNullOrWhiteSpace(folder) ? "Divers" : folder.Trim();

        var existing = await _db.FileFolders.AsNoTracking()
            .Where(f => f.Name == name && f.ParentFolderId == null)
            .Select(f => new { f.Id })
            .FirstOrDefaultAsync(ct);
        if (existing is not null) return existing.Id;

        var created = new FileFolder { OrganizationId = orgId, Name = name };
        _db.FileFolders.Add(created);
        await _db.SaveChangesAsync(ct);
        return created.Id;
    }

    private static string Truncate(string value, int max)
        => value.Length <= max ? value : value[..max];
}
