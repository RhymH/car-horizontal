namespace CarHorizontal.Api.Modules.Leads.Dtos;

/// <summary>A staff member of the active organization (for the "assigned to" selector).</summary>
public class LeadTeamMemberDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}
