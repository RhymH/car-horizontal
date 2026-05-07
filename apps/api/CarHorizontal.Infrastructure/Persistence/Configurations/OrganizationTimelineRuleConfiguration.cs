using CarHorizontal.Domain.Entities.Timeline;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class OrganizationTimelineRuleConfiguration : IEntityTypeConfiguration<OrganizationTimelineRule>
{
    public void Configure(EntityTypeBuilder<OrganizationTimelineRule> builder)
    {
        builder.ToTable("organization_timeline_rules");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.RuleCode).IsRequired().HasMaxLength(80);
        builder.Property(r => r.Enabled).IsRequired();
        builder.HasIndex(r => new { r.OrganizationId, r.RuleCode }).IsUnique();
    }
}
