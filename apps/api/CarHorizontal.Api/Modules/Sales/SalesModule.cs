using CarHorizontal.Api.Modules.Sales.Dtos;
using CarHorizontal.Api.Modules.Sales.Validators;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Sales;

public static class SalesModule
{
    public static IServiceCollection AddCarHorizontalSales(this IServiceCollection services)
    {
        services.AddScoped<ISaleService, SaleService>();
        services.AddScoped<IValidator<UpsertSaleListingRequestDto>, UpsertSaleListingRequestValidator>();
        services.AddScoped<IValidator<ChangeSalePriceRequestDto>, ChangeSalePriceRequestValidator>();
        services.AddScoped<IValidator<UpsertChannelPostRequestDto>, UpsertChannelPostRequestValidator>();
        services.AddScoped<IValidator<UpsertInquiryRequestDto>, UpsertInquiryRequestValidator>();
        services.AddScoped<IValidator<BuildMosaicRequestDto>, BuildMosaicRequestValidator>();
        services.AddScoped<IValidator<UpsertRegistrationRequestDto>, UpsertRegistrationRequestValidator>();
        return services;
    }
}
