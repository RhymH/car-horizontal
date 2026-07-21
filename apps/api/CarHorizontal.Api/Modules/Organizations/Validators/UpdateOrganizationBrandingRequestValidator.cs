using CarHorizontal.Api.Modules.Organizations.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Organizations.Validators;

public class UpdateOrganizationBrandingRequestValidator : AbstractValidator<UpdateOrganizationBrandingRequestDto>
{
    public UpdateOrganizationBrandingRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);

        RuleFor(x => x.BrandPrimaryColor)
            .Matches("^#[0-9a-fA-F]{6}$")
            .When(x => !string.IsNullOrWhiteSpace(x.BrandPrimaryColor))
            .WithMessage("La couleur doit être au format hexadécimal #RRGGBB.");

        RuleFor(x => x.BrandLogoUrl)
            .MaximumLength(500)
            .Must(BeHttpUrl)
            .When(x => !string.IsNullOrWhiteSpace(x.BrandLogoUrl))
            .WithMessage("L'URL du logo doit être une URL http(s) valide.");

        RuleFor(x => x.BrandCoverImageUrl)
            .MaximumLength(500)
            .Must(BeHttpUrl)
            .When(x => !string.IsNullOrWhiteSpace(x.BrandCoverImageUrl))
            .WithMessage("L'URL de l'image doit être une URL http(s) valide.");

        RuleFor(x => x.BrandTagline).MaximumLength(200);
        RuleFor(x => x.ContactPhone).MaximumLength(30);
    }

    private static bool BeHttpUrl(string? url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
