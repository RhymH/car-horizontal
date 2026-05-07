using CarHorizontal.Domain.Entities.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class MaintenanceProgramItemConfiguration : IEntityTypeConfiguration<MaintenanceProgramItem>
{
    public void Configure(EntityTypeBuilder<MaintenanceProgramItem> builder)
    {
        builder.ToTable("maintenance_program_items");
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Code).IsRequired().HasMaxLength(60);
        builder.Property(i => i.Title).IsRequired().HasMaxLength(160);
        builder.Property(i => i.Description).HasMaxLength(1000);
        builder.Property(i => i.Trigger).HasConversion<int>();
        builder.Property(i => i.Severity).HasConversion<int>();
        builder.Property(i => i.EstimatedCostMin).HasPrecision(10, 2);
        builder.Property(i => i.EstimatedCostMax).HasPrecision(10, 2);
        builder.Property(i => i.RequiredParts).HasColumnType("text[]");

        builder.HasIndex(i => new { i.ProgramId, i.Code });
    }
}
