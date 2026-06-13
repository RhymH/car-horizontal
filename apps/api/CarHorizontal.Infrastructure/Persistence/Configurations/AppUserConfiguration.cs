using CarHorizontal.Domain.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> builder)
    {
        builder.Property(u => u.FullName).IsRequired().HasMaxLength(200);

        // Staff par défaut : les comptes existants restent staff après migration.
        builder.Property(u => u.UserType).HasConversion<int>().HasDefaultValue(UserType.Staff);

        // Un client final est rattaché à au plus une fiche Customer.
        builder.HasIndex(u => u.CustomerId);
    }
}
