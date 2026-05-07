using CarHorizontal.Api.Modules.Maintenance.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Maintenance.Validators;

public class UpdateMaintenanceRequestValidator : AbstractValidator<UpdateMaintenanceRequestDto>
{
    public UpdateMaintenanceRequestValidator()
    {
        RuleFor(x => x.PerformedAt!.Value)
            .Must(d => d <= DateTime.UtcNow.AddDays(1))
            .When(x => x.PerformedAt.HasValue)
            .WithMessage("PerformedAt cannot be in the future.");

        RuleFor(x => x.MileageAtService!.Value)
            .GreaterThanOrEqualTo(0)
            .When(x => x.MileageAtService.HasValue);

        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.MechanicName).MaximumLength(120);

        RuleFor(x => x.Cost!.Value)
            .GreaterThanOrEqualTo(0)
            .When(x => x.Cost.HasValue);

        RuleFor(x => x.NextDueMileage!.Value)
            .GreaterThan(0)
            .When(x => x.NextDueMileage.HasValue);

        RuleFor(x => x.Type)
            .Must(MaintenanceValidationRules.IsValidMaintenanceType!)
            .When(x => x.Type is not null)
            .WithMessage(MaintenanceValidationRules.TypeError);
    }
}
