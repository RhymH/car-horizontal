using CarHorizontal.Api.Modules.Leasing.Dtos;
using CarHorizontal.Api.Modules.Leasing.Validators;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Leasing;

public static class LeasingModule
{
    public static IServiceCollection AddCarHorizontalLeasing(this IServiceCollection services)
    {
        services.AddScoped<ILeasingService, LeasingService>();
        services.AddScoped<IValidator<CreateLeasingContractRequestDto>, CreateLeasingContractRequestValidator>();
        services.AddScoped<IValidator<UpdateLeasingContractRequestDto>, UpdateLeasingContractRequestValidator>();
        return services;
    }
}
