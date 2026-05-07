using CarHorizontal.Domain.Entities.Vehicles;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class VehicleConfiguration : IEntityTypeConfiguration<Vehicle>
{
    public void Configure(EntityTypeBuilder<Vehicle> builder)
    {
        builder.ToTable("vehicles");
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Make).IsRequired().HasMaxLength(80);
        builder.Property(v => v.Model).IsRequired().HasMaxLength(80);
        builder.Property(v => v.Vin).HasMaxLength(40);
        builder.Property(v => v.LicensePlate).HasMaxLength(20);
        builder.Property(v => v.TransmissionType).HasMaxLength(40);
        builder.Property(v => v.Color).HasMaxLength(40);
        builder.Property(v => v.EngineType).HasConversion<int?>();
        // Unique only when LicensePlate is non-null. Postgres treats NULLs as
        // distinct in unique indexes, so a partial filter expresses intent.
        builder.HasIndex(v => new { v.OrganizationId, v.LicensePlate })
            .IsUnique()
            .HasFilter("\"LicensePlate\" IS NOT NULL");
        builder.HasIndex(v => new { v.OrganizationId, v.CustomerId });
        builder.HasIndex(v => v.VehicleModelId);
    }
}
