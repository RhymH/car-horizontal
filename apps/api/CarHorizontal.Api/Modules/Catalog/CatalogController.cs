using CarHorizontal.Api.Modules.Catalog.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Catalog;

[ApiController]
[Authorize]
[Route("api/catalog")]
public class CatalogController : ControllerBase
{
    private readonly ICatalogService _catalog;

    public CatalogController(ICatalogService catalog)
    {
        _catalog = catalog;
    }

    [HttpGet("vehicle-models")]
    public async Task<ActionResult<VehicleModelListResponseDto>> ListVehicleModels(
        [FromQuery] string? q,
        [FromQuery] string? make,
        [FromQuery] string? fuel,
        [FromQuery] int? yearAt,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        var result = await _catalog.ListAsync(q, make, fuel, yearAt, page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("vehicle-models/{id:guid}")]
    public async Task<ActionResult<VehicleModelDetailDto>> GetVehicleModel(Guid id, CancellationToken ct)
    {
        var result = await _catalog.GetAsync(id, ct);
        if (result is null) return NotFound();
        return Ok(result);
    }
}
