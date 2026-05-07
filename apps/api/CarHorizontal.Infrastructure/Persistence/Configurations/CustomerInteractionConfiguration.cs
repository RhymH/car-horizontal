using CarHorizontal.Domain.Entities.Customers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class CustomerInteractionConfiguration : IEntityTypeConfiguration<CustomerInteraction>
{
    public void Configure(EntityTypeBuilder<CustomerInteraction> builder)
    {
        builder.ToTable("customer_interactions");
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Type).HasConversion<int>();
        builder.Property(i => i.Summary).IsRequired().HasMaxLength(2000);
        builder.HasIndex(i => new { i.OrganizationId, i.CustomerId, i.OccurredAt });
    }
}
