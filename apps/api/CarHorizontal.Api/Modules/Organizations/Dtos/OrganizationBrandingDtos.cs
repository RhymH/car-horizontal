namespace CarHorizontal.Api.Modules.Organizations.Dtos;

/// <summary>
/// Configuration marque blanche du garage : identité affichée à ses clients
/// dans le portail (nom, couleur d'accent, logo, image d'ambiance, contact).
/// </summary>
public class OrganizationBrandingResponseDto
{
    public string Name { get; set; } = string.Empty;
    /// <summary>Slug public — sert d'identifiant de theming côté portail client (lien /login?garage=slug).</summary>
    public string Slug { get; set; } = string.Empty;
    public string? BrandPrimaryColor { get; set; }
    public string? BrandLogoUrl { get; set; }
    public string? BrandCoverImageUrl { get; set; }
    public string? BrandTagline { get; set; }
    public string? ContactPhone { get; set; }
}

public class UpdateOrganizationBrandingRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? BrandPrimaryColor { get; set; }
    public string? BrandLogoUrl { get; set; }
    public string? BrandCoverImageUrl { get; set; }
    public string? BrandTagline { get; set; }
    public string? ContactPhone { get; set; }
}
