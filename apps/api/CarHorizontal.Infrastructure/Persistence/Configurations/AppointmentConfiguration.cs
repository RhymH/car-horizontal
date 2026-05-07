using CarHorizontal.Domain.Entities.Appointments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> builder)
    {
        builder.ToTable("appointments");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Subject).IsRequired().HasMaxLength(200);
        builder.Property(a => a.Notes).HasMaxLength(2000);
        builder.Property(a => a.Status).HasConversion<int>();
        builder.HasIndex(a => new { a.OrganizationId, a.ScheduledAt });
    }
}
