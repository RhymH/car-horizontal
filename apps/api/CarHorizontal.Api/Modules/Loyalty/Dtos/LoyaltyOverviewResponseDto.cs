namespace CarHorizontal.Api.Modules.Loyalty.Dtos;

public class LoyaltyOverviewResponseDto
{
    public LoyaltyKpisDto Kpis { get; set; } = new();
    public List<LoyaltyTrendPointDto> RetentionTrend { get; set; } = new();
}

public class LoyaltyKpisDto
{
    public double Retention12mPct { get; set; }
    public int ReturnedLast12Months { get; set; }
    public int LostCustomers { get; set; }
    public double AverageReturnIntervalDays { get; set; }
    public int AtRiskCount { get; set; }
}

public class LoyaltyTrendPointDto
{
    public string Label { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public double Value { get; set; }
}
