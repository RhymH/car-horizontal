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
        builder.Property(v => v.LicensePlate).IsRequired().HasMaxLength(20);
        builder.Property(v => v.TransmissionType).HasMaxLength(40);
        builder.Property(v => v.Color).HasMaxLength(40);
        builder.Property(v => v.EngineType).HasConversion<int>();
        builder.HasIndex(v => new { v.OrganizationId, v.LicensePlate }).IsUnique();
        builder.HasIndex(v => new { v.OrganizationId, v.CustomerId });
        builder.HasIndex(v => v.VehicleModelId);
    }
}
