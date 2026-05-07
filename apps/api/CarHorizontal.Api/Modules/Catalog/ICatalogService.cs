using CarHorizontal.Api.Modules.Catalog.Dtos;

namespace CarHorizontal.Api.Modules.Catalog;

public interface ICatalogService
{
    Task<VehicleModelListResponseDto> ListAsync(
        string? query,
        string? make,
        string? fuel,
        int? yearAt,
        int page,
        int pageSize,
        CancellationToken ct);

    Task<VehicleModelDetailDto?> GetAsync(Guid id, CancellationToken ct);
}
