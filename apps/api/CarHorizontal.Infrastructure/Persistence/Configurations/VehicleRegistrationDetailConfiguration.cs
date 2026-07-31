using CarHorizontal.Domain.Entities.Vehicles;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class VehicleRegistrationDetailConfiguration : IEntityTypeConfiguration<VehicleRegistrationDetail>
{
    public void Configure(EntityTypeBuilder<VehicleRegistrationDetail> builder)
    {
        builder.ToTable("vehicle_registration_details");
        builder.HasKey(r => r.Id);

        // Les repères de carte grise sont des codes courts ; les longueurs suivent
        // ce que le document peut réellement contenir.
        builder.Property(r => r.HolderName).HasMaxLength(160);
        builder.Property(r => r.HolderAddress).HasMaxLength(300);
        builder.Property(r => r.TypeVariantVersion).HasMaxLength(60);
        builder.Property(r => r.NationalTypeCode).HasMaxLength(40);
        builder.Property(r => r.CommercialName).HasMaxLength(80);
        builder.Property(r => r.TypeApprovalNumber).HasMaxLength(60);
        builder.Property(r => r.EuCategory).HasMaxLength(10);
        builder.Property(r => r.NationalGenre).HasMaxLength(10);
        builder.Property(r => r.EuBodyType).HasMaxLength(10);
        builder.Property(r => r.NationalBodyType).HasMaxLength(40);
        builder.Property(r => r.FuelCode).HasMaxLength(10);
        builder.Property(r => r.EmissionClass).HasMaxLength(40);
        builder.Property(r => r.CertificateFormulaNumber).HasMaxLength(40);

        builder.Property(r => r.MaxNetPowerKw).HasPrecision(8, 2);
        builder.Property(r => r.PowerToMassRatio).HasPrecision(8, 3);

        // Une seule fiche d'immatriculation par véhicule.
        builder.HasIndex(r => new { r.OrganizationId, r.VehicleId })
            .IsUnique()
            .HasFilter("\"DeletedAt\" IS NULL");
    }
}
