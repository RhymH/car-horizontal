namespace CarHorizontal.Domain.Entities.Identity;

public class UserOrganization
{
    public Guid UserId { get; set; }
    public Guid OrganizationId { get; set; }
    public OrganizationRole Role { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
