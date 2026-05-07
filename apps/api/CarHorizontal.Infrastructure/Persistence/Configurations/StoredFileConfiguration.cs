using CarHorizontal.Domain.Entities.Files;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class StoredFileConfiguration : IEntityTypeConfiguration<StoredFile>
{
    public void Configure(EntityTypeBuilder<StoredFile> builder)
    {
        builder.ToTable("stored_files");
        builder.HasKey(f => f.Id);
        builder.Property(f => f.OriginalFileName).IsRequired().HasMaxLength(300);
        builder.Property(f => f.ContentType).IsRequired().HasMaxLength(200);
        builder.Property(f => f.BinaryContent).HasColumnType("bytea");
        builder.Property(f => f.Sha256).IsRequired().HasMaxLength(64);
        builder.HasIndex(f => new { f.OrganizationId, f.Sha256 });
    }
}
