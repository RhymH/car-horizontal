using Microsoft.Extensions.Caching.Memory;

namespace CarHorizontal.Api.Jobs;

public class LoyaltyRecomputeJob
{
    private readonly ILogger<LoyaltyRecomputeJob> _logger;
    private readonly IMemoryCache _cache;

    public LoyaltyRecomputeJob(ILogger<LoyaltyRecomputeJob> logger, IMemoryCache cache)
    {
        _logger = logger;
        _cache = cache;
    }

    public Task RunAsync(CancellationToken ct = default)
    {
        if (_cache is MemoryCache mc)
        {
            mc.Compact(1.0);
        }
        _logger.LogInformation("LoyaltyRecomputeJob: cleared loyalty caches; next request will recompute.");
        return Task.CompletedTask;
    }
}
