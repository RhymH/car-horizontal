using CarHorizontal.Domain.Entities.Leads;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class LeadImportBatchConfiguration : IEntityTypeConfiguration<LeadImportBatch>
{
    public void Configure(EntityTypeBuilder<LeadImportBatch> builder)
    {
        builder.ToTable("lead_import_batches");
        builder.HasKey(b => b.Id);
        builder.Property(b => b.FileName).IsRequired().HasMaxLength(300);
        builder.Property(b => b.ReportJson).HasColumnType("jsonb");
        builder.HasIndex(b => new { b.OrganizationId, b.CreatedAt });
    }
}
