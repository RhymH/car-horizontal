using CarHorizontal.Api.Modules.Timeline.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Timeline.Validators;

public class CreateTimelineEventRequestValidator : AbstractValidator<CreateTimelineEventRequestDto>
{
    public CreateTimelineEventRequestValidator()
    {
        RuleFor(x => x.VehicleId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.DueMileage).GreaterThan(0).When(x => x.DueMileage.HasValue);

        RuleFor(x => x.Kind)
            .Must(TimelineValidationRules.IsValidKind)
            .WithMessage(TimelineValidationRules.KindError);

        RuleFor(x => x)
            .Must(x => x.DueAt.HasValue || x.DueMileage.HasValue)
            .WithMessage("Either DueAt or DueMileage must be provided.");
    }
}
