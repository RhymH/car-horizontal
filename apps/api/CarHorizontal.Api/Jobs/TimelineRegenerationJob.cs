using CarHorizontal.Infrastructure.Persistence;
using CarHorizontal.Infrastructure.Timeline;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Jobs;

public class TimelineRegenerationJob
{
    private readonly AppDbContext _db;
    private readonly ITimelineEngine _engine;
    private readonly ILogger<TimelineRegenerationJob> _logger;

    public TimelineRegenerationJob(
        AppDbContext db,
        ITimelineEngine engine,
        ILogger<TimelineRegenerationJob> logger)
    {
        _db = db;
        _engine = engine;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken ct = default)
    {
        var orgIds = await _db.Organizations
            .Select(o => o.Id)
            .ToListAsync(ct);

        var total = 0;
        foreach (var orgId in orgIds)
        {
            try
            {
                total += await _engine.RunForOrganizationAsync(orgId, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Timeline regeneration failed for organization {OrganizationId}", orgId);
            }
        }

        _logger.LogInformation("Daily timeline regeneration produced {Count} new events across {OrgCount} organizations.", total, orgIds.Count);
    }
}
