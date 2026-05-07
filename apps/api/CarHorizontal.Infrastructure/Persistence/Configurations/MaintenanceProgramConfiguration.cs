using CarHorizontal.Domain.Entities.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class MaintenanceProgramConfiguration : IEntityTypeConfiguration<MaintenanceProgram>
{
    public void Configure(EntityTypeBuilder<MaintenanceProgram> builder)
    {
        builder.ToTable("maintenance_programs");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Name).IsRequired().HasMaxLength(80);
        builder.Property(p => p.SourceReference).HasMaxLength(255);
        builder.Property(p => p.Source).HasConversion<int>();

        builder.HasIndex(p => new { p.VehicleModelId, p.Name }).IsUnique();

        builder.HasMany(p => p.Items)
            .WithOne(i => i.Program!)
            .HasForeignKey(i => i.ProgramId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
