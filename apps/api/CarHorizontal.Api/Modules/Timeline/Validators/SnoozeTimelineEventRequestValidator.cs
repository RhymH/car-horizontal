using CarHorizontal.Api.Modules.Timeline.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Timeline.Validators;

public class SnoozeTimelineEventRequestValidator : AbstractValidator<SnoozeTimelineEventRequestDto>
{
    public SnoozeTimelineEventRequestValidator()
    {
        RuleFor(x => x.Days)
            .InclusiveBetween(1, 365)
            .WithMessage("Days must be between 1 and 365.");
    }
}
