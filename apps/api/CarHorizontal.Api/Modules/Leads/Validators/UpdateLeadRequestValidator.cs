using CarHorizontal.Api.Modules.Leads.Dtos;
using CarHorizontal.Domain.Entities.Leads;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Leads.Validators;

public class UpdateLeadRequestValidator : AbstractValidator<UpdateLeadRequestDto>
{
    public UpdateLeadRequestValidator()
    {
        RuleFor(x => x.Stage)
            .NotEmpty()
            .Must(v => Enum.TryParse<LeadStage>(v, ignoreCase: true, out _))
            .WithMessage("Statut de prospect invalide.");

        RuleFor(x => x.Source)
            .NotEmpty()
            .Must(v => Enum.TryParse<LeadSource>(v, ignoreCase: true, out _))
            .WithMessage("Source invalide.");

        RuleFor(x => x.SourceDetail).MaximumLength(200);
        RuleFor(x => x.InterestSummary).MaximumLength(2000);
        RuleFor(x => x.LostReason).MaximumLength(500);
    }
}
