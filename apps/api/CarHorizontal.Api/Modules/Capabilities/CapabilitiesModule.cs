namespace CarHorizontal.Api.Modules.Capabilities;

public static class CapabilitiesModule
{
    public static IServiceCollection AddCarHorizontalCapabilities(this IServiceCollection services)
    {
        services.AddScoped<ICapabilityService, CapabilityService>();
        return services;
    }
}
