using CarHorizontal.Api.Modules.Reminders.Dtos;
using CarHorizontal.Api.Modules.Reminders.Validators;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Reminders;

public static class RemindersModule
{
    public static IServiceCollection AddCarHorizontalReminders(this IServiceCollection services)
    {
        services.AddScoped<IRemindersService, RemindersService>();
        services.AddScoped<IValidator<CreateReminderRequestDto>, CreateReminderRequestValidator>();
        services.AddScoped<IValidator<UpdateReminderRequestDto>, UpdateReminderRequestValidator>();
        services.AddScoped<IValidator<SnoozeReminderRequestDto>, SnoozeReminderRequestValidator>();
        services.AddScoped<IValidator<CreateFromTimelineRequestDto>, CreateFromTimelineRequestValidator>();
        return services;
    }
}
