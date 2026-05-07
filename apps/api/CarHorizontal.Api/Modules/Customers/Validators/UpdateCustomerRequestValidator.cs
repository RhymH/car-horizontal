using CarHorizontal.Api.Modules.Customers.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Customers.Validators;

public class UpdateCustomerRequestValidator : AbstractValidator<UpdateCustomerRequestDto>
{
    public UpdateCustomerRequestValidator()
    {
        RuleFor(x => x.FullName)
            .MinimumLength(2)
            .MaximumLength(150)
            .When(x => x.FullName is not null);

        RuleFor(x => x.Email)
            .EmailAddress()
            .MaximumLength(200)
            .When(x => !string.IsNullOrWhiteSpace(x.Email));

        RuleFor(x => x.Phone)
            .Matches(CustomerValidationRules.PhoneE164Pattern)
            .WithMessage("Phone must be in E.164 format (e.g. +33612345678)")
            .When(x => !string.IsNullOrWhiteSpace(x.Phone));

        RuleFor(x => x.PostalCode).MaximumLength(20);
        RuleFor(x => x.City).MaximumLength(120);
        RuleFor(x => x.Address).MaximumLength(300);
        RuleFor(x => x.Notes).MaximumLength(2000);

        RuleFor(x => x.Status!)
            .Must(CustomerValidationRules.IsValidStatus)
            .WithMessage("Status must be Active, Inactive or Lost.")
            .When(x => x.Status is not null);
    }
}
