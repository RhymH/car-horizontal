using CarHorizontal.Api.Modules.Timeline.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Timeline.Validators;

public class UpdateTimelineEventRequestValidator : AbstractValidator<UpdateTimelineEventRequestDto>
{
    public UpdateTimelineEventRequestValidator()
    {
        RuleFor(x => x.Title).MaximumLength(200).When(x => x.Title is not null);
        RuleFor(x => x.Description).MaximumLength(2000).When(x => x.Description is not null);
        RuleFor(x => x.DueMileage).GreaterThan(0).When(x => x.DueMileage.HasValue);

        RuleFor(x => x.Kind)
            .Must(TimelineValidationRules.IsValidKind!)
            .When(x => x.Kind is not null)
            .WithMessage(TimelineValidationRules.KindError);
    }
}
