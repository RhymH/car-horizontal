namespace CarHorizontal.Infrastructure.Timeline;

public interface ITimelineEngine
{
    /// <summary>Run the rules for a single vehicle and persist new events.</summary>
    Task<int> RunForVehicleAsync(Guid vehicleId, CancellationToken ct = default);

    /// <summary>Run the rules for every vehicle of an organization.</summary>
    Task<int> RunForOrganizationAsync(Guid organizationId, CancellationToken ct = default);
}
