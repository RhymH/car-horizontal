using CarHorizontal.Api.Modules.Leads.Dtos;
using CarHorizontal.Domain.Entities.Customers;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Leads.Validators;

public class CreateLeadFollowUpRequestValidator : AbstractValidator<CreateLeadFollowUpRequestDto>
{
    public CreateLeadFollowUpRequestValidator()
    {
        RuleFor(x => x.DueAt)
            .NotEmpty()
            .WithMessage("Date de relance requise.");

        RuleFor(x => x.Channel)
            .NotEmpty()
            .Must(v => Enum.TryParse<CustomerInteractionType>(v, ignoreCase: true, out _))
            .WithMessage("Canal de relance invalide.");

        RuleFor(x => x.Note).MaximumLength(1000);
    }
}
