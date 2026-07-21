using CarHorizontal.Api.Modules.Organizations.Dtos;
using CarHorizontal.Api.Modules.Organizations.Validators;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Organizations;

public static class OrganizationsModule
{
    // IOrganizationService est enregistré par AuthModule (création d'org au signup).
    public static IServiceCollection AddCarHorizontalOrganizations(this IServiceCollection services)
    {
        services.AddScoped<IValidator<UpdateOrganizationBrandingRequestDto>, UpdateOrganizationBrandingRequestValidator>();
        return services;
    }
}
