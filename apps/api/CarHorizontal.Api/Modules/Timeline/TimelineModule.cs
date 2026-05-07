using CarHorizontal.Api.Modules.Timeline.Dtos;
using CarHorizontal.Api.Modules.Timeline.Validators;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Timeline;

public static class TimelineModule
{
    public static IServiceCollection AddCarHorizontalTimeline(this IServiceCollection services)
    {
        services.AddScoped<ITimelineService, TimelineService>();
        services.AddScoped<IValidator<CreateTimelineEventRequestDto>, CreateTimelineEventRequestValidator>();
        services.AddScoped<IValidator<UpdateTimelineEventRequestDto>, UpdateTimelineEventRequestValidator>();
        services.AddScoped<IValidator<SnoozeTimelineEventRequestDto>, SnoozeTimelineEventRequestValidator>();
        return services;
    }
}
