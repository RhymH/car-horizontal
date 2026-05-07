using CarHorizontal.Domain.Entities.Organizations;

namespace CarHorizontal.Api.Modules.Organizations;

public interface IOrganizationService
{
    Task<Organization> CreateForOwnerAsync(Guid ownerUserId, string ownerFullName, CancellationToken ct = default);
}
