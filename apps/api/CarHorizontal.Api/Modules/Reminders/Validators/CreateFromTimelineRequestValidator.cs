using CarHorizontal.Api.Modules.Reminders.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Reminders.Validators;

public class CreateFromTimelineRequestValidator : AbstractValidator<CreateFromTimelineRequestDto>
{
    public CreateFromTimelineRequestValidator()
    {
        RuleFor(x => x.Channel)
            .Must(ReminderValidationRules.IsValidChannel!)
            .When(x => x.Channel is not null)
            .WithMessage(ReminderValidationRules.ChannelError);
    }
}
