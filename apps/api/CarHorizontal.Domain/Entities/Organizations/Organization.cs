using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Organizations;

public class Organization : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public Guid? LogoFileId { get; set; }
    public string DefaultLocale { get; set; } = "fr-FR";
    public string Timezone { get; set; } = "Europe/Paris";
    public string PhoneCountryCode { get; set; } = "+33";

    // Marque blanche du portail client : le garage personnalise l'expérience
    // vue par ses propres clients (couleur d'accent, logo, image, signature).
    /// <summary>Couleur d'accent hex "#RRGGBB" appliquée au portail client.</summary>
    public string? BrandPrimaryColor { get; set; }
    /// <summary>URL du logo affiché dans le portail client.</summary>
    public string? BrandLogoUrl { get; set; }
    /// <summary>URL de l'image d'ambiance (écran de connexion, en-têtes).</summary>
    public string? BrandCoverImageUrl { get; set; }
    /// <summary>Signature courte du garage (ex. "L'excellence automobile depuis 1987").</summary>
    public string? BrandTagline { get; set; }
    /// <summary>Téléphone affiché aux clients ("Contactez votre garage").</summary>
    public string? ContactPhone { get; set; }
}
