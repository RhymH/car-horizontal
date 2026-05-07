using CarHorizontal.Api.Modules.Maintenance.Dtos;
using CarHorizontal.Api.Modules.Maintenance.Validators;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Maintenance;

public static class MaintenanceModule
{
    public static IServiceCollection AddCarHorizontalMaintenance(this IServiceCollection services)
    {
        services.AddScoped<IMaintenanceService, MaintenanceService>();
        services.AddScoped<IValidator<CreateMaintenanceRequestDto>, CreateMaintenanceRequestValidator>();
        services.AddScoped<IValidator<UpdateMaintenanceRequestDto>, UpdateMaintenanceRequestValidator>();
        return services;
    }
}
