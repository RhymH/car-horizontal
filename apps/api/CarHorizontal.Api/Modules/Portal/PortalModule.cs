namespace CarHorizontal.Api.Modules.Portal;

public static class PortalModule
{
    public static IServiceCollection AddCarHorizontalPortal(this IServiceCollection services)
    {
        services.AddScoped<IPortalAuthService, PortalAuthService>();
        return services;
    }
}
