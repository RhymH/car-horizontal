using CarHorizontal.Api.Modules.Vehicles.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Vehicles.Validators;

public class CreateVehicleRequestValidator : AbstractValidator<CreateVehicleRequestDto>
{
    public CreateVehicleRequestValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Make).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Model).NotEmpty().MaximumLength(80);
        RuleFor(x => x.LicensePlate)
            .MaximumLength(20)
            .When(x => !string.IsNullOrWhiteSpace(x.LicensePlate));

        RuleFor(x => x.Year!.Value)
            .InclusiveBetween(VehicleValidationRules.MinYear, VehicleValidationRules.MaxYear)
            .When(x => x.Year.HasValue)
            .WithMessage($"Year must be between {VehicleValidationRules.MinYear} and {VehicleValidationRules.MaxYear}.");

        RuleFor(x => x.CurrentMileage).GreaterThanOrEqualTo(0);

        RuleFor(x => x.Vin).MaximumLength(40);
        RuleFor(x => x.TransmissionType).MaximumLength(40);
        RuleFor(x => x.Color).MaximumLength(40);

        RuleFor(x => x.EngineType)
            .Must(VehicleValidationRules.IsValidEngineType!)
            .When(x => !string.IsNullOrWhiteSpace(x.EngineType))
            .WithMessage("EngineType must be one of: Gasoline, Diesel, Hybrid, Electric, LPG.");
    }
}
