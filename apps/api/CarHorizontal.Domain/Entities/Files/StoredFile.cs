using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Files;

public class StoredFile : OrganizationEntityBase
{
    public Guid FolderId { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public byte[] BinaryContent { get; set; } = Array.Empty<byte>();
    public string Sha256 { get; set; } = string.Empty;
}
