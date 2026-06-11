using CarHorizontal.Domain.Entities.Organizations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class OrganizationFeatureConfiguration : IEntityTypeConfiguration<OrganizationFeature>
{
    public void Configure(EntityTypeBuilder<OrganizationFeature> builder)
    {
        builder.ToTable("organization_features");
        builder.HasKey(f => f.Id);

        builder.Property(f => f.Capability).HasMaxLength(60).IsRequired();

        // One row per (organization, capability): a capability is pinned once.
        builder.HasIndex(f => new { f.OrganizationId, f.Capability }).IsUnique();
    }
}
