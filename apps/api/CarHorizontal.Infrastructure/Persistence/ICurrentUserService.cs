namespace CarHorizontal.Infrastructure.Persistence;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    Guid? OrganizationId { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
}
