using CarHorizontal.Domain.Notifications;

namespace CarHorizontal.Api.Jobs;

/// <summary>
/// P1-B — Generates staff notifications across every organization from timeline
/// signals and CRM heuristics. Idempotent, so it is safe to run daily.
/// </summary>
public class GenerateNotificationsJob
{
    private readonly INotificationGenerator _generator;
    private readonly ILogger<GenerateNotificationsJob> _logger;

    public GenerateNotificationsJob(INotificationGenerator generator, ILogger<GenerateNotificationsJob> logger)
    {
        _generator = generator;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken ct = default)
    {
        var created = await _generator.GenerateAsync(ct);
        _logger.LogInformation("GenerateNotificationsJob created {Count} notifications.", created);
    }
}
