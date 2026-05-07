using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Files;

public class FileMetadata : OrganizationEntityBase
{
    public Guid StoredFileId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}
