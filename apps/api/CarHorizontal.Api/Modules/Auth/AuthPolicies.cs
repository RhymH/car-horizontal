namespace CarHorizontal.Api.Modules.Auth;

/// <summary>Noms des politiques d'autorisation par type de compte.</summary>
public static class AuthPolicies
{
    /// <summary>Réservé au staff garage (refuse les comptes client). = policy par défaut.</summary>
    public const string StaffOnly = "StaffOnly";

    /// <summary>Réservé aux comptes client (portail).</summary>
    public const string CustomerOnly = "CustomerOnly";
}
