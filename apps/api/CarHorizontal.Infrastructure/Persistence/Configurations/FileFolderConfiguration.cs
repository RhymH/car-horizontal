using CarHorizontal.Domain.Entities.Files;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class FileFolderConfiguration : IEntityTypeConfiguration<FileFolder>
{
    public void Configure(EntityTypeBuilder<FileFolder> builder)
    {
        builder.ToTable("file_folders");
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Name).IsRequired().HasMaxLength(200);
        builder.HasIndex(f => new { f.OrganizationId, f.ParentFolderId, f.Name });
    }
}
