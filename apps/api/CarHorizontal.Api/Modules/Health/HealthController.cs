using System.Diagnostics;
using CarHorizontal.Api.Modules.Health.Dtos;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Health;

/// <summary>
/// Sonde publique utilisée par l'écran de diagnostic du portail (et par les
/// load balancers). Volontairement anonyme, sans effet de bord et sans donnée
/// métier : elle sert uniquement à répondre « est-ce que l'API est vivante ? ».
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/health")]
public class HealthController : ControllerBase
{
    /// <summary>Timeout court : une sonde qui traîne est aussi inutile qu'une sonde KO.</summary>
    private static readonly TimeSpan DatabaseProbeTimeout = TimeSpan.FromSeconds(3);

    private readonly AppDbContext _db;

    public HealthController(AppDbContext db) => _db = db;

    /// <summary>Liveness : l'API répond. Ne touche aucune dépendance.</summary>
    [HttpGet]
    public ActionResult<HealthResponseDto> Get()
    {
        NoStore();
        return Ok(new HealthResponseDto("ok", "carhorizontal-api", DateTime.UtcNow));
    }

    /// <summary>
    /// Readiness : l'API répond et la base est joignable. Renvoie 503 si la base
    /// est injoignable, avec le détail dans le corps pour l'écran de diagnostic.
    /// </summary>
    [HttpGet("ready")]
    public async Task<ActionResult<ReadinessResponseDto>> GetReady(CancellationToken ct)
    {
        NoStore();

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(DatabaseProbeTimeout);

        var watch = Stopwatch.StartNew();
        bool databaseUp;
        try
        {
            databaseUp = await _db.Database.CanConnectAsync(timeout.Token);
        }
        catch
        {
            databaseUp = false;
        }
        watch.Stop();

        var dto = new ReadinessResponseDto(
            databaseUp ? "ok" : "degraded",
            databaseUp ? "ok" : "unavailable",
            watch.ElapsedMilliseconds,
            DateTime.UtcNow);

        return databaseUp
            ? Ok(dto)
            : StatusCode(StatusCodes.Status503ServiceUnavailable, dto);
    }

    private void NoStore() =>
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
}
