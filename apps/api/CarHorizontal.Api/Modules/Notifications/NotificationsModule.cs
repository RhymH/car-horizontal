namespace CarHorizontal.Api.Modules.Notifications;

public static class NotificationsModule
{
    public static IServiceCollection AddCarHorizontalNotifications(this IServiceCollection services)
    {
        services.AddScoped<INotificationsService, NotificationsService>();
        return services;
    }
}
