namespace CarHorizontal.Api.Jobs;

// Placeholder. Actual loyalty metric pre-computation is wired up in Phase 13 (T120).
public class LoyaltyRecomputeJob
{
    private readonly ILogger<LoyaltyRecomputeJob> _logger;

    public LoyaltyRecomputeJob(ILogger<LoyaltyRecomputeJob> logger)
    {
        _logger = logger;
    }

    public Task RunAsync(CancellationToken ct = default)
    {
        _logger.LogInformation("LoyaltyRecomputeJob is a stub awaiting Phase 13 (T120).");
        return Task.CompletedTask;
    }
}
