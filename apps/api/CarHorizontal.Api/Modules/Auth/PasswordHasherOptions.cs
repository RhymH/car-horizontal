namespace CarHorizontal.Api.Modules.Auth;

public static class PasswordPolicy
{
    public const int MinLength = 10;
    public const bool RequireDigit = true;
    public const bool RequireLowercase = true;
    public const bool RequireUppercase = true;
    public const bool RequireNonAlphanumeric = true;
}
