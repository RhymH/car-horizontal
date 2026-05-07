using CarHorizontal.Domain.Entities.Vehicles;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class VehicleProgramOverrideConfiguration : IEntityTypeConfiguration<VehicleProgramOverride>
{
    public void Configure(EntityTypeBuilder<VehicleProgramOverride> builder)
    {
        builder.ToTable("vehicle_program_overrides");
        builder.HasKey(o => o.Id);
        builder.Property(o => o.ItemCode).IsRequired().HasMaxLength(60);
        builder.Property(o => o.Reason).HasMaxLength(500);

        builder.HasIndex(o => new { o.OrganizationId, o.VehicleId, o.ItemCode }).IsUnique();
    }
}
