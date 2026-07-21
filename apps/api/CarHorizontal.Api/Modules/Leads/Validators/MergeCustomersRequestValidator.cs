using CarHorizontal.Api.Modules.Leads.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Leads.Validators;

public class MergeCustomersRequestValidator : AbstractValidator<MergeCustomersRequestDto>
{
    public MergeCustomersRequestValidator()
    {
        RuleFor(x => x.PrimaryCustomerId).NotEmpty();
        RuleFor(x => x.DuplicateCustomerId)
            .NotEmpty()
            .NotEqual(x => x.PrimaryCustomerId)
            .WithMessage("La fiche à fusionner doit être différente de la fiche principale.");
    }
}
