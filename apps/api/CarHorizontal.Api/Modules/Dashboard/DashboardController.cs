using CarHorizontal.Api.Modules.Dashboard.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Dashboard;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _service;

    public DashboardController(IDashboardService service)
    {
        _service = service;
    }

    [HttpGet("overview")]
    public async Task<ActionResult<DashboardOverviewResponseDto>> Overview(CancellationToken ct)
    {
        var result = await _service.GetOverviewAsync(ct);
        return Ok(result);
    }
}
