using CarHorizontal.Api.Jobs;
using Hangfire;
using Hangfire.Dashboard;
using Hangfire.PostgreSql;

namespace CarHorizontal.Api.Extensions;

public static class HangfireConfig
{
    public static IServiceCollection AddCarHorizontalHangfire(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default is required for Hangfire.");

        services.AddHangfire(config =>
        {
            config
                .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UsePostgreSqlStorage(options => options.UseNpgsqlConnection(connectionString));
        });

        services.AddHangfireServer(options =>
        {
            options.WorkerCount = Math.Max(2, Environment.ProcessorCount);
            options.Queues = new[] { "default" };
        });

        return services;
    }

    public static IApplicationBuilder UseCarHorizontalHangfire(
        this WebApplication app,
        IConfiguration configuration)
    {
        var dashboardEnabled = configuration.GetValue("Hangfire:DashboardEnabled", true);
        if (dashboardEnabled)
        {
            var dashboardOptions = new DashboardOptions
            {
                Authorization = new[] { new HangfireDashboardAuthorizationFilter(app.Environment.IsDevelopment()) }
            };
            app.UseHangfireDashboard("/hangfire", dashboardOptions);
        }

        RegisterRecurringJobs();
        return app;
    }

    private static void RegisterRecurringJobs()
    {
        RecurringJob.AddOrUpdate<TimelineRegenerationJob>(
            "daily-timeline-regeneration",
            job => job.RunAsync(CancellationToken.None),
            "0 2 * * *");

        RecurringJob.AddOrUpdate<EnsureRemindersJob>(
            "daily-ensure-reminders",
            job => job.RunAsync(CancellationToken.None),
            "0 3 * * *");

        RecurringJob.AddOrUpdate<DispatchDueRemindersJob>(
            "every-5-min-dispatch-due-reminders",
            job => job.RunAsync(CancellationToken.None),
            "*/5 * * * *");

        RecurringJob.AddOrUpdate<LoyaltyRecomputeJob>(
            "weekly-loyalty-recompute",
            job => job.RunAsync(CancellationToken.None),
            "0 4 * * 1");
    }
}

internal sealed class HangfireDashboardAuthorizationFilter : IDashboardAuthorizationFilter
{
    private readonly bool _allowAnonymousInDev;

    public HangfireDashboardAuthorizationFilter(bool allowAnonymousInDev)
    {
        _allowAnonymousInDev = allowAnonymousInDev;
    }

    public bool Authorize(DashboardContext context)
    {
        var http = context.GetHttpContext();
        if (_allowAnonymousInDev) return true;

        var user = http.User;
        if (user?.Identity?.IsAuthenticated != true) return false;

        return user.IsInRole("Owner") || user.IsInRole("Admin");
    }
}
