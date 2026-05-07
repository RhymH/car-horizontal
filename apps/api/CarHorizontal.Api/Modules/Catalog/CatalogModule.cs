namespace CarHorizontal.Api.Modules.Catalog;

public static class CatalogModule
{
    public static IServiceCollection AddCarHorizontalCatalog(this IServiceCollection services)
    {
        services.AddScoped<ICatalogService, CatalogService>();
        return services;
    }
}
