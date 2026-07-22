using CarHorizontal.Api.Modules.Vehicles.Dtos;
using CarHorizontal.Api.Modules.Vehicles.Validators;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Vehicles;

public static class VehiclesModule
{
    public static IServiceCollection AddCarHorizontalVehicles(this IServiceCollection services)
    {
        services.AddScoped<IVehicleService, VehicleService>();
        services.AddScoped<IValidator<CreateVehicleRequestDto>, CreateVehicleRequestValidator>();
        services.AddScoped<IValidator<UpdateVehicleRequestDto>, UpdateVehicleRequestValidator>();
        services.AddScoped<IValidator<UpdateMileageRequestDto>, UpdateMileageRequestValidator>();
        services.AddScoped<IValidator<AddVehicleNoteRequestDto>, AddVehicleNoteRequestValidator>();
        return services;
    }
}
