namespace CarHorizontal.Api.Modules.Leads.Dtos;

public class LeadStatsRequestDto
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }

    /// <summary>Optional LeadSource name filter.</summary>
    public string? Source { get; set; }

    /// <summary>Optional campaign tag filter (exact, case-insensitive).</summary>
    public string? Tag { get; set; }

    public Guid? AssignedToUserId { get; set; }
}

/// <summary>
/// Everything the statistics page needs in one call. Two lenses coexist:
/// KPIs/timeline measure the ACTIVITY of the period (arrivals, wins, losses
/// dated inside it), while the source/tag breakdowns follow the COHORT created
/// in the period to its current outcome — the right lens for campaign ROI.
/// </summary>
public class LeadStatsResponseDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }

    /// <summary>day | week | month — bucket size of the timeline.</summary>
    public string Granularity { get; set; } = "day";

    public LeadStatsKpisDto Kpis { get; set; } = new();
    public List<LeadStatsTimePointDto> Timeline { get; set; } = new();
    public List<LeadStatsFunnelStepDto> Funnel { get; set; } = new();
    public List<LeadStatsBreakdownDto> BySource { get; set; } = new();
    public List<LeadStatsBreakdownDto> ByTag { get; set; } = new();
    public List<LeadStatsUserDto> ByUser { get; set; } = new();
    public List<LeadStatsLostReasonDto> LostReasons { get; set; } = new();

    /// <summary>Every tag carried by at least one lead (feeds the filter).</summary>
    public List<string> AvailableTags { get; set; } = new();
}

public class LeadStatsKpisDto
{
    public int NewLeads { get; set; }
    public int NewLeadsPrev { get; set; }
    public int Won { get; set; }
    public int WonPrev { get; set; }
    public int Lost { get; set; }
    public int LostPrev { get; set; }

    /// <summary>Won / (Won + Lost) closed in the period, 0..1. Null when nothing closed.</summary>
    public double? ConversionRate { get; set; }
    public double? ConversionRatePrev { get; set; }

    /// <summary>Average days from lead creation to Won, for wins of the period.</summary>
    public double? AvgDaysToConvert { get; set; }
    public double? AvgDaysToConvertPrev { get; set; }

    public int Interactions { get; set; }
    public int InteractionsPrev { get; set; }
    public int FollowUpsCompleted { get; set; }
    public int FollowUpsCompletedPrev { get; set; }

    /// <summary>Snapshot, not period-bound.</summary>
    public int OpenPipeline { get; set; }
    public int OverdueFollowUps { get; set; }
}

public class LeadStatsTimePointDto
{
    /// <summary>Start of the bucket (UTC date).</summary>
    public DateTime Period { get; set; }
    public int NewLeads { get; set; }
    public int Won { get; set; }
    public int Lost { get; set; }
    public int Interactions { get; set; }
}

public class LeadStatsFunnelStepDto
{
    /// <summary>LeadStage name (open stages + Won).</summary>
    public string Stage { get; set; } = string.Empty;

    /// <summary>Cohort leads that reached at least this stage (linear funnel).</summary>
    public int Count { get; set; }
}

public class LeadStatsBreakdownDto
{
    /// <summary>Source name or tag value.</summary>
    public string Key { get; set; } = string.Empty;
    public int Created { get; set; }
    public int Won { get; set; }
    public int Lost { get; set; }
    public int Open { get; set; }
}

public class LeadStatsUserDto
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Won { get; set; }
    public int Open { get; set; }
    public int OverdueFollowUps { get; set; }
    public int Interactions { get; set; }
}

public class LeadStatsLostReasonDto
{
    public string Reason { get; set; } = string.Empty;
    public int Count { get; set; }
}
