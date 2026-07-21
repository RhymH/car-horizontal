using CarHorizontal.Domain.Entities.Organizations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class OrganizationConfiguration : IEntityTypeConfiguration<Organization>
{
    public void Configure(EntityTypeBuilder<Organization> builder)
    {
        builder.ToTable("organizations");
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Name).IsRequired().HasMaxLength(200);
        builder.Property(o => o.Slug).IsRequired().HasMaxLength(120);
        builder.Property(o => o.DefaultLocale).HasMaxLength(10);
        builder.Property(o => o.Timezone).HasMaxLength(60);
        builder.Property(o => o.PhoneCountryCode).HasMaxLength(8);
        builder.Property(o => o.BrandPrimaryColor).HasMaxLength(9);
        builder.Property(o => o.BrandLogoUrl).HasMaxLength(500);
        builder.Property(o => o.BrandCoverImageUrl).HasMaxLength(500);
        builder.Property(o => o.BrandTagline).HasMaxLength(200);
        builder.Property(o => o.ContactPhone).HasMaxLength(30);
        builder.HasIndex(o => o.Slug).IsUnique();
    }
}
