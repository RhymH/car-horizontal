using Microsoft.AspNetCore.Identity;

namespace CarHorizontal.Domain.Entities.Identity;

public class AppUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    /// <summary>Nature du compte : staff garage ou client final. Staff par défaut.</summary>
    public UserType UserType { get; set; } = UserType.Staff;

    /// <summary>Fiche <c>Customer</c> rattachée quand <see cref="UserType"/> = Customer.</summary>
    public Guid? CustomerId { get; set; }
}
