using CarHorizontal.Domain.Entities.Messaging;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class MessageLogConfiguration : IEntityTypeConfiguration<MessageLog>
{
    public void Configure(EntityTypeBuilder<MessageLog> builder)
    {
        builder.ToTable("message_logs");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Recipient).IsRequired().HasMaxLength(200);
        builder.Property(m => m.Subject).HasMaxLength(200);
        builder.Property(m => m.Body).IsRequired();
        builder.Property(m => m.Channel).HasConversion<int>();
        builder.Property(m => m.Status).HasConversion<int>();
        builder.Property(m => m.ProviderMessageId).HasMaxLength(200);
        builder.Property(m => m.ErrorMessage).HasMaxLength(1000);
        builder.HasIndex(m => new { m.OrganizationId, m.SentAt });
    }
}
