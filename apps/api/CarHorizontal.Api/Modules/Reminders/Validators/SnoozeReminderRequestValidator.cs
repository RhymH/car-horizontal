using CarHorizontal.Api.Modules.Reminders.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Reminders.Validators;

public class SnoozeReminderRequestValidator : AbstractValidator<SnoozeReminderRequestDto>
{
    public SnoozeReminderRequestValidator()
    {
        RuleFor(x => x.Days)
            .InclusiveBetween(1, 365)
            .WithMessage("Days must be between 1 and 365.");
    }
}
