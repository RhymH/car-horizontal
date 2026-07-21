using CarHorizontal.Api.Modules.Organizations.Dtos;
using CarHorizontal.Domain.Entities.Organizations;

namespace CarHorizontal.Api.Modules.Organizations;

public interface IOrganizationService
{
    Task<Organization> CreateForOwnerAsync(Guid ownerUserId, string ownerFullName, CancellationToken ct = default);

    /// <summary>Marque blanche de l'organisation courante.</summary>
    Task<OrganizationBrandingResponseDto> GetBrandingAsync(CancellationToken ct = default);

    /// <summary>Met à jour la marque blanche de l'organisation courante.</summary>
    Task<OrganizationBrandingResponseDto> UpdateBrandingAsync(
        UpdateOrganizationBrandingRequestDto request, CancellationToken ct = default);
}
