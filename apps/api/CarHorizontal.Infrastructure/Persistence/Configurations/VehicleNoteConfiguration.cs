using CarHorizontal.Domain.Entities.Vehicles;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class VehicleNoteConfiguration : IEntityTypeConfiguration<VehicleNote>
{
    public void Configure(EntityTypeBuilder<VehicleNote> builder)
    {
        builder.ToTable("vehicle_notes");
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Body).IsRequired().HasMaxLength(2000);
        builder.HasIndex(n => new { n.OrganizationId, n.VehicleId, n.OccurredAt });
    }
}
