using CarHorizontal.Api.Modules.Leasing.Dtos;
using CarHorizontal.Domain.Entities.Leasing;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Leasing.Validators;

public class CreateLeasingContractRequestValidator : AbstractValidator<CreateLeasingContractRequestDto>
{
    public CreateLeasingContractRequestValidator()
    {
        RuleFor(x => x.VehicleId).NotEmpty().WithMessage("Le véhicule est requis.");
        RuleFor(x => x.Lessor).NotEmpty().WithMessage("Le bailleur est requis.").MaximumLength(120);
        RuleFor(x => x.Reference).MaximumLength(80);
        RuleFor(x => x.Notes).MaximumLength(2000);
        RuleFor(x => x.EndDate).GreaterThan(x => x.StartDate)
            .WithMessage("La date de fin doit être postérieure à la date de début.");
        RuleFor(x => x.MonthlyPayment).GreaterThanOrEqualTo(0).When(x => x.MonthlyPayment.HasValue);
        RuleFor(x => x.BuyoutValue).GreaterThanOrEqualTo(0).When(x => x.BuyoutValue.HasValue);
        RuleFor(x => x.MileageCapKm).GreaterThan(0).When(x => x.MileageCapKm.HasValue);
    }
}

public class UpdateLeasingContractRequestValidator : AbstractValidator<UpdateLeasingContractRequestDto>
{
    public UpdateLeasingContractRequestValidator()
    {
        RuleFor(x => x.Lessor).MaximumLength(120).When(x => x.Lessor is not null);
        RuleFor(x => x.Reference).MaximumLength(80);
        RuleFor(x => x.Notes).MaximumLength(2000);
        RuleFor(x => x.MonthlyPayment).GreaterThanOrEqualTo(0).When(x => x.MonthlyPayment.HasValue);
        RuleFor(x => x.BuyoutValue).GreaterThanOrEqualTo(0).When(x => x.BuyoutValue.HasValue);
        RuleFor(x => x.MileageCapKm).GreaterThan(0).When(x => x.MileageCapKm.HasValue);

        // Cohérence des dates uniquement quand les deux sont fournies.
        RuleFor(x => x.EndDate)
            .GreaterThan(x => x.StartDate!.Value)
            .When(x => x.StartDate.HasValue && x.EndDate.HasValue)
            .WithMessage("La date de fin doit être postérieure à la date de début.");

        RuleFor(x => x.Status)
            .Must(s => Enum.TryParse<LeasingContractStatus>(s, ignoreCase: true, out _))
            .When(x => !string.IsNullOrWhiteSpace(x.Status))
            .WithMessage("Statut invalide (Active, Ended ou Cancelled).");
    }
}
