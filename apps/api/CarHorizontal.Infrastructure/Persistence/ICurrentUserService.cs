namespace CarHorizontal.Infrastructure.Persistence;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    Guid? OrganizationId { get; }
    bool IsAuthenticated { get; }
}
