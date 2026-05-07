using CarHorizontal.Api.Modules.Appointments.Dtos;
using CarHorizontal.Api.Modules.Appointments.Validators;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Appointments;

public static class AppointmentsModule
{
    public static IServiceCollection AddCarHorizontalAppointments(this IServiceCollection services)
    {
        services.AddScoped<IAppointmentsService, AppointmentsService>();
        services.AddScoped<IValidator<CreateAppointmentRequestDto>, CreateAppointmentRequestValidator>();
        services.AddScoped<IValidator<UpdateAppointmentRequestDto>, UpdateAppointmentRequestValidator>();
        return services;
    }
}
