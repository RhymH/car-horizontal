using CarHorizontal.Domain.Entities.Timeline;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class TimelineEventConfiguration : IEntityTypeConfiguration<TimelineEvent>
{
    public void Configure(EntityTypeBuilder<TimelineEvent> builder)
    {
        builder.ToTable("timeline_events");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Title).IsRequired().HasMaxLength(200);
        builder.Property(t => t.Description).HasMaxLength(2000);
        builder.Property(t => t.GeneratedFromRule).HasMaxLength(120);
        builder.Property(t => t.Kind).HasConversion<int>();
        builder.Property(t => t.Status).HasConversion<int>();
        builder.Property(t => t.Source).HasConversion<int>();
        builder.HasIndex(t => new { t.OrganizationId, t.VehicleId, t.DueAt });
        builder.HasIndex(t => new { t.OrganizationId, t.Status, t.DueAt });
    }
}
