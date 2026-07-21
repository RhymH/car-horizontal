using CarHorizontal.Api.Modules.Loyalty.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Loyalty;

[ApiController]
[Authorize]
[Route("api/loyalty")]
public class LoyaltyController : ControllerBase
{
    private readonly ILoyaltyMetricsService _service;

    public LoyaltyController(ILoyaltyMetricsService service)
    {
        _service = service;
    }

    [HttpGet("overview")]
    public async Task<ActionResult<LoyaltyOverviewResponseDto>> Overview(CancellationToken ct)
        => Ok(await _service.GetOverviewAsync(ct));

    [HttpGet("cohorts")]
    public async Task<ActionResult<LoyaltyCohortsResponseDto>> Cohorts(CancellationToken ct)
        => Ok(await _service.GetCohortsAsync(ct));

    [HttpGet("retention-curve")]
    public async Task<ActionResult<LoyaltyRetentionCurveResponseDto>> RetentionCurve(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
        => Ok(await _service.GetRetentionCurveAsync(from, to, ct));

    [HttpGet("at-risk-customers")]
    public async Task<ActionResult<LoyaltyCustomerListResponseDto>> AtRisk(
        [FromQuery] int? limit,
        CancellationToken ct)
        => Ok(await _service.GetAtRiskCustomersAsync(limit, ct));

    [HttpGet("lost-customers")]
    public async Task<ActionResult<LoyaltyCustomerListResponseDto>> Lost(
        [FromQuery] int? limit,
        CancellationToken ct)
        => Ok(await _service.GetLostCustomersAsync(limit, ct));
}
