using CarHorizontal.Domain.Entities.Vehicles;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class VehicleMileageReadingConfiguration : IEntityTypeConfiguration<VehicleMileageReading>
{
    public void Configure(EntityTypeBuilder<VehicleMileageReading> builder)
    {
        builder.ToTable("vehicle_mileage_readings");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Source).HasConversion<int>();
        builder.Property(r => r.Notes).HasMaxLength(500);
        builder.HasIndex(r => new { r.OrganizationId, r.VehicleId, r.ObservedAt });
        builder.HasIndex(r => r.VehicleId);
    }
}
