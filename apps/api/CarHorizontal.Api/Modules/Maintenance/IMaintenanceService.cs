using CarHorizontal.Api.Modules.Maintenance.Dtos;

namespace CarHorizontal.Api.Modules.Maintenance;

public interface IMaintenanceService
{
    Task<MaintenanceListResponseDto> ListByVehicleAsync(Guid vehicleId, MaintenanceListRequestDto request, CancellationToken ct = default);
    Task<MaintenanceRecordDto> CreateAsync(Guid vehicleId, CreateMaintenanceRequestDto request, CancellationToken ct = default);
    Task<MaintenanceRecordDto> UpdateAsync(Guid id, UpdateMaintenanceRequestDto request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
