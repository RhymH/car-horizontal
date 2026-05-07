using CarHorizontal.Domain.Timeline.Rules;
using CarHorizontal.Infrastructure.Persistence;
using CarHorizontal.Infrastructure.Persistence.Interceptors;
using CarHorizontal.Infrastructure.Reminders;
using CarHorizontal.Infrastructure.Timeline;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CarHorizontal.Infrastructure;

public static class InfrastructureServiceCollectionExtensions
{
    public static IServiceCollection AddCarHorizontalInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddScoped<AuditInterceptor>();
        services.AddScoped<SoftDeleteInterceptor>();

        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default is required.");

        services.AddDbContext<AppDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString);
            options.AddInterceptors(
                sp.GetRequiredService<AuditInterceptor>(),
                sp.GetRequiredService<SoftDeleteInterceptor>());
        });

        services.AddScoped<IRule, SixMonthMaintenanceRule>();
        services.AddScoped<IRule, AnnualTechnicalInspectionRule>();
        services.AddScoped<IRule, TireSwapRule>();
        services.AddScoped<IRule, MileageBasedServiceRule>();
        services.AddScoped<IRule, TradeInOpportunityRule>();
        services.AddScoped<IRule, WarrantyExpiryRule>();
        services.AddScoped<ITimelineEngine, TimelineEngine>();

        services.AddScoped<IAutoReminderScheduler, AutoReminderScheduler>();

        return services;
    }
}
