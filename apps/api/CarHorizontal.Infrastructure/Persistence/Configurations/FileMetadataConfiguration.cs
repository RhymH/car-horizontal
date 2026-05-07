using CarHorizontal.Domain.Entities.Files;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class FileMetadataConfiguration : IEntityTypeConfiguration<FileMetadata>
{
    public void Configure(EntityTypeBuilder<FileMetadata> builder)
    {
        builder.ToTable("file_metadata");
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Key).IsRequired().HasMaxLength(120);
        builder.Property(f => f.Value).HasMaxLength(2000);
        builder.HasIndex(f => new { f.StoredFileId, f.Key });
    }
}
