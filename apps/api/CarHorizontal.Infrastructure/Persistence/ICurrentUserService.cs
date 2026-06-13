namespace CarHorizontal.Infrastructure.Persistence;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    Guid? OrganizationId { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }

    /// <summary>Fiche client liée au compte (présent uniquement pour un token de type Customer).</summary>
    Guid? CustomerId { get; }
}
