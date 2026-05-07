using CarHorizontal.Api.Modules.Customers.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Customers.Validators;

public class AddInteractionRequestValidator : AbstractValidator<AddInteractionRequestDto>
{
    public AddInteractionRequestValidator()
    {
        RuleFor(x => x.Type)
            .Must(CustomerValidationRules.IsValidInteractionType)
            .WithMessage("Type must be Call, Visit, Sms, Email or Note.");

        RuleFor(x => x.Summary)
            .NotEmpty()
            .MaximumLength(2000);
    }
}
