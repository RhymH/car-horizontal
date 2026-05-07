using CarHorizontal.Api.Modules.Vehicles.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Vehicles.Validators;

public class UpdateVehicleRequestValidator : AbstractValidator<UpdateVehicleRequestDto>
{
    public UpdateVehicleRequestValidator()
    {
        RuleFor(x => x.Make).MaximumLength(80).When(x => x.Make is not null);
        RuleFor(x => x.Model).MaximumLength(80).When(x => x.Model is not null);
        RuleFor(x => x.LicensePlate)
            .MaximumLength(20)
            .When(x => !string.IsNullOrWhiteSpace(x.LicensePlate));
        RuleFor(x => x.Vin).MaximumLength(40);
        RuleFor(x => x.TransmissionType).MaximumLength(40);
        RuleFor(x => x.Color).MaximumLength(40);

        RuleFor(x => x.Year!.Value)
            .InclusiveBetween(VehicleValidationRules.MinYear, VehicleValidationRules.MaxYear)
            .When(x => x.Year.HasValue)
            .WithMessage($"Year must be between {VehicleValidationRules.MinYear} and {VehicleValidationRules.MaxYear}.");

        RuleFor(x => x.EngineType)
            .Must(VehicleValidationRules.IsValidEngineType!)
            .When(x => x.EngineType is not null)
            .WithMessage("EngineType must be one of: Gasoline, Diesel, Hybrid, Electric, LPG.");
    }
}
