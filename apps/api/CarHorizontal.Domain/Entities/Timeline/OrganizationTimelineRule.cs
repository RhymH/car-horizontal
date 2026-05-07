using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Timeline;

public class OrganizationTimelineRule : OrganizationEntityBase
{
    public string RuleCode { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
}
