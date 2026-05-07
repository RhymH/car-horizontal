using CarHorizontal.Api.Modules.Appointments.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Appointments.Validators;

public class CreateAppointmentRequestValidator : AbstractValidator<CreateAppointmentRequestDto>
{
    public CreateAppointmentRequestValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.ScheduledAt).NotEmpty();
        RuleFor(x => x.DurationMinutes).InclusiveBetween(5, 480);
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Notes).MaximumLength(2000);
    }
}
