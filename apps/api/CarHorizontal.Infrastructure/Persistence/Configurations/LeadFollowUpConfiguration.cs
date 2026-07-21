using CarHorizontal.Domain.Entities.Leads;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class LeadFollowUpConfiguration : IEntityTypeConfiguration<LeadFollowUp>
{
    public void Configure(EntityTypeBuilder<LeadFollowUp> builder)
    {
        builder.ToTable("lead_follow_ups");
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Channel).HasConversion<int>();
        builder.Property(f => f.Status).HasConversion<int>();
        builder.Property(f => f.Note).HasMaxLength(1000);
        builder.HasIndex(f => new { f.OrganizationId, f.CustomerId, f.Status });
        builder.HasIndex(f => new { f.OrganizationId, f.Status, f.DueAt });
    }
}
