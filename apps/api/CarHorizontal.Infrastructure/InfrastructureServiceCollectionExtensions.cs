using CarHorizontal.Domain.Files;
using CarHorizontal.Domain.Messaging;
using CarHorizontal.Domain.Notifications;
using CarHorizontal.Domain.Timeline.Rules;
using CarHorizontal.Domain.Vehicles;
using CarHorizontal.Infrastructure.Catalog.Seed;
using CarHorizontal.Infrastructure.Files;
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
        services.AddScoped<IRule, LeasingTimelineRule>();
        services.AddScoped<ITimelineEngine, TimelineEngine>();

        services.AddScoped<IAutoReminderScheduler, AutoReminderScheduler>();

        services.AddScoped<IMileageEstimationService, MileageEstimationService>();

        AddVinDecoding(services, configuration);

        services.AddScoped<INotificationGenerator, NotificationGenerator>();

        services.AddScoped<ICatalogSeeder, CatalogSeeder>();

        // Stockage des binaires en base pour le MVP ; le traitement d'images est
        // sans état, donc partageable en singleton.
        services.AddScoped<IFileStorage, DbFileStorage>();
        services.AddSingleton<IImageProcessor, SkiaImageProcessor>();

        AddMessaging(services, configuration);

        return services;
    }

    /// <summary>
    /// Registers the VIN decoder. The provider is chosen via configuration
    /// (<c>VinDecoder:Provider</c>): "nhtsa" (default) enriches over the network
    /// and falls back to the offline decoder on any failure; "offline" is fully
    /// local (no network dependency). An unknown provider fails fast — same idiom
    /// as messaging. The offline decoder is always registered because the online
    /// provider composes it for structural validation and fallback.
    /// </summary>
    private static void AddVinDecoding(IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<OfflineVinDecoder>();

        var provider = (configuration["VinDecoder:Provider"] ?? "nhtsa").Trim().ToLowerInvariant();
        switch (provider)
        {
            case "offline":
                services.AddSingleton<IVinDecoder>(sp => sp.GetRequiredService<OfflineVinDecoder>());
                break;

            case "nhtsa":
                // A single long-lived HttpClient is the correct lifetime here (one
                // stable host); Timeout bounds the graceful-degradation window.
                var baseUrl = configuration["VinDecoder:Nhtsa:BaseUrl"]
                    ?? "https://vpic.nhtsa.dot.gov/api/vehicles/";
                var http = new HttpClient
                {
                    BaseAddress = new Uri(baseUrl),
                    Timeout = TimeSpan.FromSeconds(5)
                };
                services.AddSingleton<IVinDecoder>(sp => new NhtsaVinDecoder(
                    http,
                    sp.GetRequiredService<OfflineVinDecoder>(),
                    sp.GetRequiredService<ILogger<NhtsaVinDecoder>>()));
                break;

            default:
                throw new NotSupportedException(
                    $"VIN decoder provider '{provider}' is not implemented. " +
                    "Use 'offline' or 'nhtsa'.");
        }
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
