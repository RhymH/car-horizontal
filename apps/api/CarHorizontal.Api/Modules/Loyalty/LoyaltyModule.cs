namespace CarHorizontal.Api.Modules.Loyalty;

public static class LoyaltyModule
{
    public static IServiceCollection AddCarHorizontalLoyalty(this IServiceCollection services)
    {
        services.AddMemoryCache();
        services.AddScoped<ILoyaltyMetricsService, LoyaltyMetricsService>();
        return services;
    }
}
