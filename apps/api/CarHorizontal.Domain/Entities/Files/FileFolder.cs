using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Files;

public class FileFolder : OrganizationEntityBase
{
    public string Name { get; set; } = string.Empty;
    public Guid? ParentFolderId { get; set; }
}
