using CarHorizontal.Domain.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class UserOrganizationConfiguration : IEntityTypeConfiguration<UserOrganization>
{
    public void Configure(EntityTypeBuilder<UserOrganization> builder)
    {
        builder.ToTable("user_organizations");
        builder.HasKey(uo => new { uo.UserId, uo.OrganizationId });
        builder.HasIndex(uo => uo.OrganizationId);
        builder.Property(uo => uo.Role).HasConversion<int>();
    }
}
