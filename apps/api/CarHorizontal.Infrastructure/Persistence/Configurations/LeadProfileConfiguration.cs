using CarHorizontal.Domain.Entities.Leads;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class LeadProfileConfiguration : IEntityTypeConfiguration<LeadProfile>
{
    public void Configure(EntityTypeBuilder<LeadProfile> builder)
    {
        builder.ToTable("lead_profiles");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Stage).HasConversion<int>();
        builder.Property(l => l.Source).HasConversion<int>();
        builder.Property(l => l.SourceDetail).HasMaxLength(200);
        builder.Property(l => l.InterestSummary).HasMaxLength(2000);
        builder.Property(l => l.LostReason).HasMaxLength(500);
        builder.HasIndex(l => new { l.OrganizationId, l.CustomerId }).IsUnique();
        builder.HasIndex(l => new { l.OrganizationId, l.Stage, l.NextFollowUpAt });
    }
}
