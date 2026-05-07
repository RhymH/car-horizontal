namespace CarHorizontal.Domain.Vehicles;

public interface IMileageEstimationService
{
    Task<MileageEstimate> EstimateAtAsync(Guid vehicleId, DateTime asOf, CancellationToken ct = default);

    /// <summary>
    /// Drop the cached estimate for a vehicle. Call after writing a new reading.
    /// </summary>
    void InvalidateCache(Guid vehicleId);
}
