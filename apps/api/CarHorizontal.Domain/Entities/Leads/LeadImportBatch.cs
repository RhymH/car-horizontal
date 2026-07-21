using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Leads;

/// <summary>
/// Audit record of one committed bulk import of prospects. Counts summarise
/// the outcome; ReportJson keeps the full per-row report for later review.
/// </summary>
public class LeadImportBatch : OrganizationEntityBase
{
    public string FileName { get; set; } = string.Empty;

    public int TotalRows { get; set; }
    public int CreatedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int SkippedCount { get; set; }
    public int ErrorCount { get; set; }

    /// <summary>Serialized per-row import report (jsonb).</summary>
    public string ReportJson { get; set; } = "[]";
}
