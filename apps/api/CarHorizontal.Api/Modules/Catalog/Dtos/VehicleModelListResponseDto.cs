namespace CarHorizontal.Api.Modules.Catalog.Dtos;

public sealed class VehicleModelListResponseDto
{
    public IReadOnlyList<VehicleModelListItemDto> Items { get; set; } = Array.Empty<VehicleModelListItemDto>();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; }
}
