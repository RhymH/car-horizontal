using CarHorizontal.Domain.Entities.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("notifications");
        builder.HasKey(n => n.Id);

        builder.Property(n => n.Kind).HasConversion<int>();
        builder.Property(n => n.Severity).HasConversion<int>();
        builder.Property(n => n.Status).HasConversion<int>();
        builder.Property(n => n.Action).HasConversion<int>();

        builder.Property(n => n.Title).HasMaxLength(200).IsRequired();
        builder.Property(n => n.Message).HasMaxLength(2000).IsRequired();
        builder.Property(n => n.DedupKey).HasMaxLength(120).IsRequired();

        // Inbox queries: by org + status, urgent first.
        builder.HasIndex(n => new { n.OrganizationId, n.Status, n.Severity });
        // Idempotency lookups by the generator.
        builder.HasIndex(n => new { n.OrganizationId, n.DedupKey });
    }
}
