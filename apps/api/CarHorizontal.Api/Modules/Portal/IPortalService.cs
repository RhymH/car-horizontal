using CarHorizontal.Api.Modules.Portal.Dtos;

namespace CarHorizontal.Api.Modules.Portal;

/// <summary>Données du portail, toujours scopées au client authentifié (token).</summary>
public interface IPortalService
{
    Task<PortalProfileDto> GetProfileAsync(CancellationToken ct = default);
    Task<List<PortalVehicleDto>> GetVehiclesAsync(CancellationToken ct = default);

    /// <summary>Le client déclare le kilométrage actuel d'un de ses véhicules.</summary>
    Task SubmitMileageAsync(Guid vehicleId, int mileage, CancellationToken ct = default);
}
