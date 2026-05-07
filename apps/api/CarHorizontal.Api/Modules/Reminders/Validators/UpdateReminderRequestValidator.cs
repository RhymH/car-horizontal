using CarHorizontal.Api.Modules.Reminders.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Reminders.Validators;

public class UpdateReminderRequestValidator : AbstractValidator<UpdateReminderRequestDto>
{
    public UpdateReminderRequestValidator()
    {
        RuleFor(x => x.ResolvedSubject).MaximumLength(200).When(x => x.ResolvedSubject is not null);
        RuleFor(x => x.ResolvedBody).MaximumLength(4000).When(x => x.ResolvedBody is not null);

        RuleFor(x => x.Channel)
            .Must(ReminderValidationRules.IsValidChannel!)
            .When(x => x.Channel is not null)
            .WithMessage(ReminderValidationRules.ChannelError);
    }
}
