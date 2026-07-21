using CarHorizontal.Api.Modules.Leads.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Leads.Validators;

public class LeadImportRequestValidator : AbstractValidator<LeadImportRequestDto>
{
    public const int MaxRows = 2000;

    public LeadImportRequestValidator()
    {
        RuleFor(x => x.FileName).MaximumLength(300);

        RuleFor(x => x.Rows)
            .NotEmpty()
            .WithMessage("Le fichier ne contient aucune ligne.")
            .Must(rows => rows.Count <= MaxRows)
            .WithMessage($"Maximum {MaxRows} lignes par import.");

        RuleForEach(x => x.Rows).ChildRules(row =>
        {
            row.RuleFor(r => r.FullName).MaximumLength(200);
            row.RuleFor(r => r.Email).MaximumLength(200);
            row.RuleFor(r => r.Phone).MaximumLength(40);
            row.RuleFor(r => r.ExternalRef).MaximumLength(120);
            row.RuleFor(r => r.Notes).MaximumLength(2000);
            row.RuleFor(r => r.InterestSummary).MaximumLength(2000);
        });
    }
}
