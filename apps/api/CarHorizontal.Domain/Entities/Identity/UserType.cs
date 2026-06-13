namespace CarHorizontal.Domain.Entities.Identity;

/// <summary>
/// Nature d'un compte. Le même magasin d'identité (ASP.NET Identity) sert le
/// staff du garage et les clients finaux ; <see cref="UserType"/> les distingue
/// et conditionne les politiques d'autorisation (StaffOnly / CustomerOnly).
/// </summary>
public enum UserType
{
    /// <summary>Collaborateur du garage (rattaché à des organisations via UserOrganization).</summary>
    Staff = 0,

    /// <summary>Client final, rattaché à une fiche <c>Customer</c> via <c>AppUser.CustomerId</c>.</summary>
    Customer = 1
}
