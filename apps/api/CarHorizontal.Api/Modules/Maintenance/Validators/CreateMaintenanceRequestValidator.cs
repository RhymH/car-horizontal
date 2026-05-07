using CarHorizontal.Api.Modules.Maintenance.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Maintenance.Validators;

public class CreateMaintenanceRequestValidator : AbstractValidator<CreateMaintenanceRequestDto>
{
    public CreateMaintenanceRequestValidator()
    {
        RuleFor(x => x.PerformedAt)
            .NotEmpty()
            .Must(d => d <= DateTime.UtcNow.AddDays(1))
            .WithMessage("PerformedAt cannot be in the future.");

        RuleFor(x => x.MileageAtService).GreaterThanOrEqualTo(0);

        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.MechanicName).MaximumLength(120);
        RuleFor(x => x.Cost).GreaterThanOrEqualTo(0).When(x => x.Cost.HasValue);
        RuleFor(x => x.NextDueMileage).GreaterThan(0).When(x => x.NextDueMileage.HasValue);

        RuleFor(x => x.Type)
            .Must(MaintenanceValidationRules.IsValidMaintenanceType)
            .WithMessage(MaintenanceValidationRules.TypeError);
    }
}
