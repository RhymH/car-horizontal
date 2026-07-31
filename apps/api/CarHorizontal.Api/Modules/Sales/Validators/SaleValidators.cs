using CarHorizontal.Api.Modules.Sales.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Sales.Validators;

public class UpsertSaleListingRequestValidator : AbstractValidator<UpsertSaleListingRequestDto>
{
    public UpsertSaleListingRequestValidator()
    {
        RuleFor(x => x.Title).MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(8000);
        RuleFor(x => x.Equipment).MaximumLength(4000);
        RuleFor(x => x.InternalNotes).MaximumLength(4000);
        RuleFor(x => x.Origin).MaximumLength(120);
        RuleFor(x => x.BuyerName).MaximumLength(160);

        RuleFor(x => x.AskingPrice).GreaterThanOrEqualTo(0).When(x => x.AskingPrice.HasValue)
            .WithMessage("Le prix affiché ne peut pas être négatif.");
        RuleFor(x => x.FloorPrice).GreaterThanOrEqualTo(0).When(x => x.FloorPrice.HasValue);
        RuleFor(x => x.PurchasePrice).GreaterThanOrEqualTo(0).When(x => x.PurchasePrice.HasValue);
        RuleFor(x => x.ReconditioningCost).GreaterThanOrEqualTo(0).When(x => x.ReconditioningCost.HasValue);
        RuleFor(x => x.SoldPrice).GreaterThanOrEqualTo(0).When(x => x.SoldPrice.HasValue);

        // Le plancher au-dessus du prix affiché est presque toujours une inversion
        // de saisie : on l'arrête ici plutôt que de laisser une marge fausse.
        RuleFor(x => x)
            .Must(x => x.FloorPrice <= x.AskingPrice)
            .When(x => x.FloorPrice.HasValue && x.AskingPrice.HasValue)
            .WithMessage("Le prix plancher doit être inférieur ou égal au prix affiché.");

        RuleFor(x => x.OwnersCount).InclusiveBetween(0, 50).When(x => x.OwnersCount.HasValue);
        RuleFor(x => x.KeysCount).InclusiveBetween(0, 10).When(x => x.KeysCount.HasValue);
        RuleFor(x => x.WarrantyMonths).InclusiveBetween(0, 120).When(x => x.WarrantyMonths.HasValue);
    }
}

public class ChangeSalePriceRequestValidator : AbstractValidator<ChangeSalePriceRequestDto>
{
    public ChangeSalePriceRequestValidator()
    {
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0)
            .WithMessage("Le prix ne peut pas être négatif.");
        RuleFor(x => x.Reason).MaximumLength(500);
    }
}

public class UpsertChannelPostRequestValidator : AbstractValidator<UpsertChannelPostRequestDto>
{
    public UpsertChannelPostRequestValidator()
    {
        RuleFor(x => x.Channel).NotEmpty().WithMessage("Le site de publication est requis.")
            .MaximumLength(80);

        RuleFor(x => x.Url).MaximumLength(2000);
        RuleFor(x => x.Url)
            .Must(BeAnHttpUrl)
            .When(x => !string.IsNullOrWhiteSpace(x.Url))
            .WithMessage("Le lien doit commencer par http:// ou https://.");

        RuleFor(x => x.ExternalReference).MaximumLength(120);
        RuleFor(x => x.Notes).MaximumLength(1000);
        RuleFor(x => x.DisplayedPrice).GreaterThanOrEqualTo(0).When(x => x.DisplayedPrice.HasValue);
    }

    private static bool BeAnHttpUrl(string? value)
        => Uri.TryCreate(value, UriKind.Absolute, out var uri)
           && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}

public class UpsertInquiryRequestValidator : AbstractValidator<UpsertInquiryRequestDto>
{
    public UpsertInquiryRequestValidator()
    {
        // Choisir un client existant *et* en décrire un nouveau est ambigu : le
        // serveur devrait deviner lequel gagne. On refuse plutôt que de choisir.
        RuleFor(x => x)
            .Must(x => x.CustomerId is null || x.NewBuyer is null)
            .WithMessage("Choisissez un client existant ou créez-en un, pas les deux.");

        When(x => x.NewBuyer is not null, () =>
        {
            RuleFor(x => x.NewBuyer!.FullName)
                .NotEmpty().WithMessage("Le nom de l'acheteur est requis.")
                .MaximumLength(160);
            RuleFor(x => x.NewBuyer!.Phone).MaximumLength(40);
            RuleFor(x => x.NewBuyer!.Email).MaximumLength(200).EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.NewBuyer!.Email));
        });

        RuleFor(x => x.OfferAmount).GreaterThanOrEqualTo(0).When(x => x.OfferAmount.HasValue);
        RuleFor(x => x.LostReason).MaximumLength(500);
        RuleFor(x => x.Notes).MaximumLength(2000);

        // Un contact ne peut pas remonter d'un canal inconnu : autant refuser tôt.
        RuleFor(x => x.Channel)
            .Must(v => Enum.TryParse<Domain.Entities.Sales.SaleInquiryChannel>(v, true, out _))
            .When(x => !string.IsNullOrWhiteSpace(x.Channel))
            .WithMessage("Canal de contact inconnu.");

        RuleFor(x => x.Status)
            .Must(v => Enum.TryParse<Domain.Entities.Sales.SaleInquiryStatus>(v, true, out _))
            .When(x => !string.IsNullOrWhiteSpace(x.Status))
            .WithMessage("Statut de contact inconnu.");
    }
}

public class BuildMosaicRequestValidator : AbstractValidator<BuildMosaicRequestDto>
{
    public BuildMosaicRequestValidator()
    {
        RuleFor(x => x.PhotoIds).NotEmpty()
            .WithMessage("Sélectionnez au moins une photo.");

        RuleFor(x => x.Columns).InclusiveBetween(1, 6);
        RuleFor(x => x.Rows).InclusiveBetween(1, 6);
        RuleFor(x => x.CellSize).InclusiveBetween(200, 2000);
        RuleFor(x => x.Gap).InclusiveBetween(0, 100);
        RuleFor(x => x.Quality).InclusiveBetween(40, 95);

        RuleFor(x => x)
            .Must(x => x.PhotoIds.Count <= x.Columns * x.Rows)
            .WithMessage("La grille choisie ne peut pas accueillir toutes les photos sélectionnées.");
    }
}

public class UpsertRegistrationRequestValidator : AbstractValidator<UpsertRegistrationRequestDto>
{
    public UpsertRegistrationRequestValidator()
    {
        RuleFor(x => x.HolderName).MaximumLength(160);
        RuleFor(x => x.HolderAddress).MaximumLength(300);
        RuleFor(x => x.TypeVariantVersion).MaximumLength(60);
        RuleFor(x => x.NationalTypeCode).MaximumLength(40);
        RuleFor(x => x.CommercialName).MaximumLength(80);
        RuleFor(x => x.TypeApprovalNumber).MaximumLength(60);
        RuleFor(x => x.EuCategory).MaximumLength(10);
        RuleFor(x => x.NationalGenre).MaximumLength(10);
        RuleFor(x => x.EuBodyType).MaximumLength(10);
        RuleFor(x => x.NationalBodyType).MaximumLength(40);
        RuleFor(x => x.FuelCode).MaximumLength(10);
        RuleFor(x => x.EmissionClass).MaximumLength(40);
        RuleFor(x => x.CertificateFormulaNumber).MaximumLength(40);

        // Bornes larges mais suffisantes pour attraper une faute de frappe (un zéro
        // de trop sur une masse ou une cylindrée).
        RuleFor(x => x.TechnicallyPermissibleMaxMassKg).InclusiveBetween(1, 60000)
            .When(x => x.TechnicallyPermissibleMaxMassKg.HasValue);
        RuleFor(x => x.MaxMassInServiceKg).InclusiveBetween(1, 60000).When(x => x.MaxMassInServiceKg.HasValue);
        RuleFor(x => x.MaxTrainMassKg).InclusiveBetween(1, 60000).When(x => x.MaxTrainMassKg.HasValue);
        RuleFor(x => x.MassInServiceKg).InclusiveBetween(1, 60000).When(x => x.MassInServiceKg.HasValue);
        RuleFor(x => x.NationalEmptyMassKg).InclusiveBetween(1, 60000).When(x => x.NationalEmptyMassKg.HasValue);

        RuleFor(x => x.EngineDisplacementCm3).InclusiveBetween(1, 30000).When(x => x.EngineDisplacementCm3.HasValue);
        RuleFor(x => x.MaxNetPowerKw).InclusiveBetween(0.1m, 2000m).When(x => x.MaxNetPowerKw.HasValue);
        RuleFor(x => x.FiscalHorsepower).InclusiveBetween(1, 100).When(x => x.FiscalHorsepower.HasValue);
        RuleFor(x => x.SeatingCapacity).InclusiveBetween(1, 100).When(x => x.SeatingCapacity.HasValue);
        RuleFor(x => x.StandingCapacity).InclusiveBetween(0, 200).When(x => x.StandingCapacity.HasValue);
        RuleFor(x => x.Co2GramsPerKm).InclusiveBetween(0, 1000).When(x => x.Co2GramsPerKm.HasValue);
        RuleFor(x => x.SoundLevelDb).InclusiveBetween(0, 200).When(x => x.SoundLevelDb.HasValue);
        RuleFor(x => x.EngineSpeedRpm).InclusiveBetween(0, 20000).When(x => x.EngineSpeedRpm.HasValue);

        RuleFor(x => x.FirstRegisteredAt)
            .LessThanOrEqualTo(_ => DateTime.UtcNow.AddDays(1))
            .When(x => x.FirstRegisteredAt.HasValue)
            .WithMessage("La date de première immatriculation ne peut pas être dans le futur.");
    }
}
