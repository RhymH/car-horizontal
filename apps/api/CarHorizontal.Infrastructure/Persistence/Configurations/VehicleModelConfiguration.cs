using CarHorizontal.Domain.Entities.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class VehicleModelConfiguration : IEntityTypeConfiguration<VehicleModel>
{
    public void Configure(EntityTypeBuilder<VehicleModel> builder)
    {
        builder.ToTable("vehicle_models");
        builder.HasKey(v => v.Id);
        builder.Ignore(v => v.DisplayName);
        builder.Property(v => v.Make).IsRequired().HasMaxLength(60);
        builder.Property(v => v.Model).IsRequired().HasMaxLength(80);
        builder.Property(v => v.Trim).HasMaxLength(80);
        builder.Property(v => v.EngineCode).HasMaxLength(40);
        builder.Property(v => v.EngineDisplayName).IsRequired().HasMaxLength(80);
        builder.Property(v => v.FuelType).IsRequired().HasMaxLength(30);
        builder.Property(v => v.Slug).IsRequired().HasMaxLength(140);
        builder.Property(v => v.EngineType).HasConversion<int>();
        builder.Property(v => v.MarketRegion).HasConversion<int>();
        builder.Property(v => v.Aliases).HasColumnType("text[]");

        builder.HasIndex(v => v.Slug).IsUnique();
        builder.HasIndex(v => new { v.Make, v.Model });

        builder.HasMany(v => v.Programs)
            .WithOne(p => p.VehicleModel!)
            .HasForeignKey(p => p.VehicleModelId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
