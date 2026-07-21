namespace CarHorizontal.Api.Modules.Leads.Dtos;

public class LeadImportRequestDto
{
    public string FileName { get; set; } = string.Empty;

    /// <summary>True = preview only: full report, nothing persisted.</summary>
    public bool DryRun { get; set; }

    /// <summary>LeadSource name applied to rows that don't carry their own.</summary>
    public string? DefaultSource { get; set; }

    public List<LeadImportRowDto> Rows { get; set; } = new();
}

public class LeadImportRowDto
{
    /// <summary>Stable id of the row in the source system — the strongest dedup key.</summary>
    public string? ExternalRef { get; set; }

    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Notes { get; set; }
    public string[]? Tags { get; set; }
    public string? InterestSummary { get; set; }
    public string? Source { get; set; }
    public string? SourceDetail { get; set; }
}
