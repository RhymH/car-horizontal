using CarHorizontal.Domain.Messaging;
using CarHorizontal.Domain.Notifications;
using CarHorizontal.Domain.Timeline.Rules;
using CarHorizontal.Domain.Vehicles;
using CarHorizontal.Infrastructure.Catalog.Seed;
using CarHorizontal.Infrastructure.Messaging;
using CarHorizontal.Infrastructure.Notifications;
using CarHorizontal.Infrastructure.Persistence;
using CarHorizontal.Infrastructure.Persistence.Interceptors;
using CarHorizontal.Infrastructure.Reminders;
using CarHorizontal.Infrastructure.Timeline;
using CarHorizontal.Infrastructure.Vehicles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

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

        services.AddScoped<IRule, ProgramExecutorRule>();
        services.AddScoped<IRule, SixMonthMaintenanceRule>();
        services.AddScoped<IRule, AnnualTechnicalInspectionRule>();
        services.AddScoped<IRule, TireSwapRule>();
        services.AddScoped<IRule, MileageBasedServiceRule>();
        services.AddScoped<IRule, TradeInOpportunityRule>();
        services.AddScoped<IRule, WarrantyExpiryRule>();
        services.AddScoped<ITimelineEngine, TimelineEngine>();

        services.AddScoped<IAutoReminderScheduler, AutoReminderScheduler>();

        services.AddScoped<IMileageEstimationService, MileageEstimationService>();

        services.AddScoped<INotificationGenerator, NotificationGenerator>();

        services.AddScoped<ICatalogSeeder, CatalogSeeder>();

        AddMessaging(services, configuration);

        return services;
    }

    /// <summary>
    /// Registers the outbound messaging pipeline. The concrete sender per channel
    /// is chosen via configuration (<c>Messaging:Email:Provider</c> /
    /// <c>Messaging:Sms:Provider</c>), defaulting to the simulated "log" provider.
    /// An unknown provider fails fast at resolution time rather than silently
    /// falling back — so a misconfigured prod never *thinks* it is sending.
    /// </summary>
    private static void AddMessaging(IServiceCollection services, IConfiguration configuration)
    {
        var emailProvider = configuration["Messaging:Email:Provider"] ?? "log";
        var smsProvider = configuration["Messaging:Sms:Provider"] ?? "log";

        services.AddScoped<IEmailSender>(sp => emailProvider.Trim().ToLowerInvariant() switch
        {
            "log" => new LogEmailSender(sp.GetRequiredService<ILogger<LogEmailSender>>()),
            _ => throw new NotSupportedException(
                $"Email provider '{emailProvider}' is not implemented. " +
                "Use 'log', or add an IEmailSender implementation and register it here.")
        });

        services.AddScoped<ISmsSender>(sp => smsProvider.Trim().ToLowerInvariant() switch
        {
            "log" => new LogSmsSender(sp.GetRequiredService<ILogger<LogSmsSender>>()),
            _ => throw new NotSupportedException(
                $"SMS provider '{smsProvider}' is not implemented. " +
                "Use 'log', or add an ISmsSender implementation and register it here.")
        });

        services.AddScoped<IMessageDispatcher, MessageDispatcher>();
    }
}
