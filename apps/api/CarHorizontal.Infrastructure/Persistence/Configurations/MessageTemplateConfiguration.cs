using CarHorizontal.Domain.Entities.Messaging;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class MessageTemplateConfiguration : IEntityTypeConfiguration<MessageTemplate>
{
    public void Configure(EntityTypeBuilder<MessageTemplate> builder)
    {
        builder.ToTable("message_templates");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Code).IsRequired().HasMaxLength(120);
        builder.Property(t => t.Subject).HasMaxLength(200);
        builder.Property(t => t.Body).IsRequired();
        builder.Property(t => t.Variables).HasColumnType("jsonb");
        builder.Property(t => t.Channel).HasConversion<int>();
        builder.HasIndex(t => new { t.OrganizationId, t.Code, t.Channel }).IsUnique();
    }
}
