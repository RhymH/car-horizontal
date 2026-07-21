namespace CarHorizontal.Api.Modules.Loyalty.Dtos;

/// <summary>
/// Stacked "layer-cake" of the active client base over calendar time, split by
/// acquisition cohort. At each bucket a client counts toward its cohort while it
/// is still active — i.e. its most recent signal (a contact, or the acquisition
/// itself) is within the churn horizon of that date. Watching a cohort's band
/// narrow over time shows exactly when that group started leaving.
/// </summary>
public class LoyaltyRetentionCurveResponseDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }

    /// <summary>day | month — bucket size of the X axis.</summary>
    public string Granularity { get; set; } = "month";

    /// <summary>Churn horizon in days used to decide "still a client".</summary>
    public int ChurnHorizonDays { get; set; }

    public List<LoyaltyRetentionBucketDto> Buckets { get; set; } = new();

    /// <summary>Ordered bottom → top: the "earlier" base band first, then cohorts oldest → newest.</summary>
    public List<LoyaltyRetentionCohortDto> Cohorts { get; set; } = new();
}

public class LoyaltyRetentionBucketDto
{
    public DateTime Period { get; set; }
    public string Label { get; set; } = string.Empty;
}

public class LoyaltyRetentionCohortDto
{
    /// <summary>"earlier" or the acquisition month as yyyy-MM.</summary>
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;

    /// <summary>True for the folded band of clients acquired before the visible window.</summary>
    public bool IsEarlier { get; set; }

    /// <summary>Clients ever acquired in this cohort (the band's peak).</summary>
    public int CohortSize { get; set; }

    /// <summary>Active count per bucket, aligned to <see cref="LoyaltyRetentionCurveResponseDto.Buckets"/>.</summary>
    public List<int> Values { get; set; } = new();
}
