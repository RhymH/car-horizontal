using CarHorizontal.Api.Modules.Customers.Dtos;
using CarHorizontal.Api.Modules.Customers.Validators;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Customers;

public static class CustomersModule
{
    public static IServiceCollection AddCarHorizontalCustomers(this IServiceCollection services)
    {
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IValidator<CreateCustomerRequestDto>, CreateCustomerRequestValidator>();
        services.AddScoped<IValidator<UpdateCustomerRequestDto>, UpdateCustomerRequestValidator>();
        services.AddScoped<IValidator<AddInteractionRequestDto>, AddInteractionRequestValidator>();
        return services;
    }
}
