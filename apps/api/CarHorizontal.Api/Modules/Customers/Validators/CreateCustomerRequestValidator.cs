using CarHorizontal.Api.Common;
using CarHorizontal.Api.Modules.Customers.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Customers.Validators;

public class CreateCustomerRequestValidator : AbstractValidator<CreateCustomerRequestDto>
{
    public CreateCustomerRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty()
            .MinimumLength(2)
            .MaximumLength(150);

        RuleFor(x => x.Email)
            .EmailAddress()
            .MaximumLength(200)
            .When(x => !string.IsNullOrWhiteSpace(x.Email));

        RuleFor(x => x.Phone)
            .Must(PhoneNormalizer.IsAcceptable)
            .WithMessage("Numéro de téléphone invalide.")
            .MaximumLength(32)
            .When(x => !string.IsNullOrWhiteSpace(x.Phone));

        RuleFor(x => x.PostalCode).MaximumLength(20);
        RuleFor(x => x.City).MaximumLength(120);
        RuleFor(x => x.Address).MaximumLength(300);
        RuleFor(x => x.Notes).MaximumLength(2000);

        RuleFor(x => x.Status)
            .Must(CustomerValidationRules.IsValidStatus)
            .WithMessage("Status must be Active, Inactive or Lost.");
    }
}
