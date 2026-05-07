using CarHorizontal.Api.Modules.Appointments.Dtos;
using CarHorizontal.Domain.Entities.Appointments;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Appointments.Validators;

public class UpdateAppointmentRequestValidator : AbstractValidator<UpdateAppointmentRequestDto>
{
    public UpdateAppointmentRequestValidator()
    {
        RuleFor(x => x.DurationMinutes)
            .InclusiveBetween(5, 480)
            .When(x => x.DurationMinutes.HasValue);

        RuleFor(x => x.Subject)
            .NotEmpty().MaximumLength(200)
            .When(x => x.Subject is not null);

        RuleFor(x => x.Notes).MaximumLength(2000);

        RuleFor(x => x.Status)
            .Must(s => Enum.TryParse<AppointmentStatus>(s, ignoreCase: true, out _))
            .WithMessage("Invalid appointment status.")
            .When(x => !string.IsNullOrWhiteSpace(x.Status));
    }
}
