namespace CarHorizontal.Api.Modules.Leads.Dtos;

public class LeadImportResultDto
{
    public bool DryRun { get; set; }
    public int TotalRows { get; set; }
    public int Created { get; set; }
    public int Updated { get; set; }
    public int Skipped { get; set; }
    public int Errors { get; set; }
    public List<LeadImportRowResultDto> Rows { get; set; } = new();
}

public class LeadImportRowResultDto
{
    /// <summary>1-based row number in the submitted file.</summary>
    public int Row { get; set; }

    public string FullName { get; set; } = string.Empty;

    /// <summary>Created | Updated | Skipped | Error</summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>ExternalRef | Phone | Email — how an existing customer was matched.</summary>
    public string? MatchedBy { get; set; }

    public string? Message { get; set; }
    public Guid? CustomerId { get; set; }
}
