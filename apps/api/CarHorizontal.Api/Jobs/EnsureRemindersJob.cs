using CarHorizontal.Infrastructure.Reminders;

namespace CarHorizontal.Api.Jobs;

public class EnsureRemindersJob
{
    private readonly IAutoReminderScheduler _scheduler;
    private readonly ILogger<EnsureRemindersJob> _logger;

    public EnsureRemindersJob(IAutoReminderScheduler scheduler, ILogger<EnsureRemindersJob> logger)
    {
        _scheduler = scheduler;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken ct = default)
    {
        var created = await _scheduler.EnsureRemindersAsync(ct);
        _logger.LogInformation("EnsureRemindersJob created {Count} reminders.", created);
    }
}
