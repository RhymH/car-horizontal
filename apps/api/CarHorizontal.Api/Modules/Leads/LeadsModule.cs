using CarHorizontal.Api.Modules.Leads.Dtos;
using CarHorizontal.Api.Modules.Leads.Validators;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Leads;

public static class LeadsModule
{
    public static IServiceCollection AddCarHorizontalLeads(this IServiceCollection services)
    {
        services.AddScoped<ILeadsService, LeadsService>();
        services.AddScoped<IValidator<UpdateLeadRequestDto>, UpdateLeadRequestValidator>();
        services.AddScoped<IValidator<CreateLeadFollowUpRequestDto>, CreateLeadFollowUpRequestValidator>();
        services.AddScoped<IValidator<MergeCustomersRequestDto>, MergeCustomersRequestValidator>();
        services.AddScoped<IValidator<LeadImportRequestDto>, LeadImportRequestValidator>();
        return services;
    }
}
