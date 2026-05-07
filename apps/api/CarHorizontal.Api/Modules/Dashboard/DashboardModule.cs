namespace CarHorizontal.Api.Modules.Dashboard;

public static class DashboardModule
{
    public static IServiceCollection AddCarHorizontalDashboard(this IServiceCollection services)
    {
        services.AddScoped<IDashboardService, DashboardService>();
        return services;
    }
}
