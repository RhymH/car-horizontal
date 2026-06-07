using CarHorizontal.Domain.Common;
using CarHorizontal.Domain.Entities.Appointments;
using CarHorizontal.Domain.Entities.Catalog;
using CarHorizontal.Domain.Entities.Customers;
using CarHorizontal.Domain.Entities.Files;
using CarHorizontal.Domain.Entities.Identity;
using CarHorizontal.Domain.Entities.Maintenance;
using CarHorizontal.Domain.Entities.Messaging;
using CarHorizontal.Domain.Entities.Notifications;
using CarHorizontal.Domain.Entities.Organizations;
using CarHorizontal.Domain.Entities.Reminders;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Domain.Entities.Vehicles;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Reflection;

namespace CarHorizontal.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>
{
    private readonly ICurrentUserService _currentUser;

    public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserService currentUser)
        : base(options)
    {
        _currentUser = currentUser;
    }

    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<UserOrganization> UserOrganizations => Set<UserOrganization>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CustomerInteraction> CustomerInteractions => Set<CustomerInteraction>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<VehicleMileageReading> VehicleMileageReadings => Set<VehicleMileageReading>();
    public DbSet<VehicleProgramOverride> VehicleProgramOverrides => Set<VehicleProgramOverride>();
    public DbSet<VehicleModel> VehicleModels => Set<VehicleModel>();
    public DbSet<MaintenanceProgram> MaintenancePrograms => Set<MaintenanceProgram>();
    public DbSet<MaintenanceProgramItem> MaintenanceProgramItems => Set<MaintenanceProgramItem>();
    public DbSet<MaintenanceRecord> MaintenanceRecords => Set<MaintenanceRecord>();
    public DbSet<TimelineEvent> TimelineEvents => Set<TimelineEvent>();
    public DbSet<OrganizationTimelineRule> OrganizationTimelineRules => Set<OrganizationTimelineRule>();
    public DbSet<Reminder> Reminders => Set<Reminder>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<MessageLog> MessageLogs => Set<MessageLog>();
    public DbSet<MessageTemplate> MessageTemplates => Set<MessageTemplate>();
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();
    public DbSet<FileFolder> FileFolders => Set<FileFolder>();
    public DbSet<FileMetadata> FileMetadata => Set<FileMetadata>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        ApplyGlobalFilters(modelBuilder);
    }

    private void ApplyGlobalFilters(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;

            if (typeof(OrganizationEntityBase).IsAssignableFrom(clrType))
            {
                var method = typeof(AppDbContext)
                    .GetMethod(nameof(SetOrgScopedQueryFilter), BindingFlags.NonPublic | BindingFlags.Instance)!
                    .MakeGenericMethod(clrType);
                method.Invoke(this, new object[] { modelBuilder });
            }
            else if (typeof(EntityBase).IsAssignableFrom(clrType))
            {
                var method = typeof(AppDbContext)
                    .GetMethod(nameof(SetSoftDeleteQueryFilter), BindingFlags.NonPublic | BindingFlags.Instance)!
                    .MakeGenericMethod(clrType);
                method.Invoke(this, new object[] { modelBuilder });
            }
        }
    }

    private void SetOrgScopedQueryFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : OrganizationEntityBase
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e =>
            e.DeletedAt == null
            && (_currentUser.OrganizationId == null || e.OrganizationId == _currentUser.OrganizationId));
    }

    private void SetSoftDeleteQueryFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : EntityBase
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e => e.DeletedAt == null);
    }
}
