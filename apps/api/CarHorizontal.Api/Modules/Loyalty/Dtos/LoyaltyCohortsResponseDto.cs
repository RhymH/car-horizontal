namespace CarHorizontal.Api.Modules.Loyalty.Dtos;

public class LoyaltyCohortsResponseDto
{
    public List<LoyaltyCohortRowDto> Cohorts { get; set; } = new();
    public int MaxOffsetMonths { get; set; }
}

public class LoyaltyCohortRowDto
{
    public string CohortLabel { get; set; } = string.Empty;
    public DateTime CohortMonth { get; set; }
    public int CohortSize { get; set; }
    public List<LoyaltyCohortCellDto> Cells { get; set; } = new();
}

public class LoyaltyCohortCellDto
{
    public int OffsetMonths { get; set; }
    public int Returned { get; set; }
    public double RetentionPct { get; set; }
}
