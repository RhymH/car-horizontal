using CarHorizontal.Api.Modules.MileageCheck.Dtos;

namespace CarHorizontal.Api.Modules.MileageCheck;

public interface IMileageCheckService
{
    Task<RequestMileageResponseDto> RequestForVehicleAsync(Guid vehicleId, CancellationToken ct = default);
    Task<MileageCheckContextDto> ResolveAsync(string token, CancellationToken ct = default);
    Task<MileageCheckContextDto> SubmitAsync(string token, int mileage, CancellationToken ct = default);

    /// <summary>
    /// Hangfire job entry-point: scan all active vehicles whose latest reading
    /// is older than 180 days and schedule a mileage-check reminder, respecting
    /// the 90-day per-vehicle and 60-day fresh-reading throttles.
    /// </summary>
    Task<int> EnsureFreshnessForAllAsync(CancellationToken ct = default);
}
