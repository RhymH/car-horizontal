using CarHorizontal.Domain.Entities.Customers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("customers");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.FullName).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Email).HasMaxLength(200);
        builder.Property(c => c.Phone).HasMaxLength(40);
        builder.Property(c => c.Address).HasMaxLength(300);
        builder.Property(c => c.City).HasMaxLength(120);
        builder.Property(c => c.PostalCode).HasMaxLength(20);
        builder.Property(c => c.Notes).HasMaxLength(2000);
        builder.Property(c => c.Status).HasConversion<int>();
        builder.Property(c => c.Tags).HasColumnType("text[]");
        builder.Property(c => c.ExternalRef).HasMaxLength(120);
        builder.HasIndex(c => new { c.OrganizationId, c.FullName });
        builder.HasIndex(c => new { c.OrganizationId, c.ExternalRef })
            .IsUnique()
            .HasFilter("\"ExternalRef\" IS NOT NULL AND \"DeletedAt\" IS NULL");
        builder.HasIndex(c => new { c.OrganizationId, c.Phone });
        builder.HasIndex(c => new { c.OrganizationId, c.Email });
        builder.HasIndex(c => new { c.OrganizationId, c.SalespersonUserId });
    }
}
