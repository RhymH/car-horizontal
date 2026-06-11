using CarHorizontal.Domain.Entities.Leasing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class LeasingContractConfiguration : IEntityTypeConfiguration<LeasingContract>
{
    public void Configure(EntityTypeBuilder<LeasingContract> builder)
    {
        builder.ToTable("leasing_contracts");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Lessor).HasMaxLength(120).IsRequired();
        builder.Property(c => c.Reference).HasMaxLength(80);
        builder.Property(c => c.Notes).HasMaxLength(2000);

        // Montants monétaires : précision fixe pour éviter les flottants.
        builder.Property(c => c.MonthlyPayment).HasPrecision(12, 2);
        builder.Property(c => c.BuyoutValue).HasPrecision(12, 2);

        builder.Property(c => c.Status).HasConversion<int>();

        // Accès le plus fréquent : contrats d'un véhicule, et balayage des contrats
        // actifs par échéance (règles Timeline).
        builder.HasIndex(c => new { c.OrganizationId, c.VehicleId });
        builder.HasIndex(c => new { c.OrganizationId, c.Status, c.EndDate });
    }
}
