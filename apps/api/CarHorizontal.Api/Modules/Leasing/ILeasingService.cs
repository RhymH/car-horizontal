using CarHorizontal.Api.Modules.Leasing.Dtos;

namespace CarHorizontal.Api.Modules.Leasing;

public interface ILeasingService
{
    Task<LeasingContractListResponseDto> ListAsync(LeasingContractListRequestDto request, CancellationToken ct = default);
    Task<LeasingContractDto> GetAsync(Guid id, CancellationToken ct = default);
    Task<LeasingContractDto> CreateAsync(CreateLeasingContractRequestDto request, CancellationToken ct = default);
    Task<LeasingContractDto> UpdateAsync(Guid id, UpdateLeasingContractRequestDto request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
