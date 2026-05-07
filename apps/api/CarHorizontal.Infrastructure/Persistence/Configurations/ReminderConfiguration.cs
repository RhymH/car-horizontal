using CarHorizontal.Domain.Entities.Reminders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class ReminderConfiguration : IEntityTypeConfiguration<Reminder>
{
    public void Configure(EntityTypeBuilder<Reminder> builder)
    {
        builder.ToTable("reminders");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Channel).HasConversion<int>();
        builder.Property(r => r.Status).HasConversion<int>();
        builder.Property(r => r.ResolvedSubject).HasMaxLength(200);
        builder.Property(r => r.ResolvedBody).HasMaxLength(4000);
        builder.Property(r => r.FailureReason).HasMaxLength(1000);
        builder.HasIndex(r => new { r.OrganizationId, r.Status, r.ScheduledAt });
    }
}
