using CarHorizontal.Domain.Entities.Maintenance;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class MaintenanceRecordConfiguration : IEntityTypeConfiguration<MaintenanceRecord>
{
    public void Configure(EntityTypeBuilder<MaintenanceRecord> builder)
    {
        builder.ToTable("maintenance_records");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Description).IsRequired().HasMaxLength(2000);
        builder.Property(m => m.MechanicName).HasMaxLength(120);
        builder.Property(m => m.Type).HasConversion<int>();
        builder.Property(m => m.Cost).HasColumnType("numeric(12,2)");
        builder.HasIndex(m => new { m.OrganizationId, m.VehicleId, m.PerformedAt });
    }
}
