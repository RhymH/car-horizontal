using CarHorizontal.Api.Modules.Reminders.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Reminders.Validators;

public class CreateReminderRequestValidator : AbstractValidator<CreateReminderRequestDto>
{
    public CreateReminderRequestValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.ScheduledAt).NotEmpty();
        RuleFor(x => x.ResolvedSubject).MaximumLength(200);
        RuleFor(x => x.ResolvedBody).MaximumLength(4000);

        RuleFor(x => x.Channel)
            .Must(ReminderValidationRules.IsValidChannel)
            .WithMessage(ReminderValidationRules.ChannelError);
    }
}
