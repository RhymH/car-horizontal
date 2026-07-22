using CarHorizontal.Api.Modules.Vehicles.Dtos;

namespace CarHorizontal.Api.Modules.Vehicles;

public interface IVehicleService
{
    Task<VehiclesListResponseDto> ListAsync(VehiclesListRequestDto request, CancellationToken ct = default);
    Task<VehicleDetailDto> GetAsync(Guid id, CancellationToken ct = default);
    Task<VehicleDetailDto> CreateAsync(CreateVehicleRequestDto request, CancellationToken ct = default);
    Task<VehicleDetailDto> UpdateAsync(Guid id, UpdateVehicleRequestDto request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<VehicleDetailDto> UpdateMileageAsync(Guid id, UpdateMileageRequestDto request, CancellationToken ct = default);
    Task<VehicleDetailDto> AddNoteAsync(Guid id, AddVehicleNoteRequestDto request, CancellationToken ct = default);
    Task<VehicleDetailDto> SetPhotoAsync(Guid id, Guid photoFileId, CancellationToken ct = default);
    Task<VehicleProgramProjectionDto?> GetProgramProjectionAsync(Guid vehicleId, CancellationToken ct = default);
    Task<MileageEstimateDto> GetMileageEstimateAsync(Guid vehicleId, CancellationToken ct = default);
}
