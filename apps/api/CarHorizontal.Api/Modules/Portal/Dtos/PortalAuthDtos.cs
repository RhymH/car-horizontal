using CarHorizontal.Api.Modules.Auth.Dtos;

namespace CarHorizontal.Api.Modules.Portal.Dtos;

public class PortalLoginRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class AcceptInviteRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

/// <summary>Session client (après login ou acceptation d'invitation).</summary>
public class PortalSessionResponseDto
{
    public Guid UserId { get; set; }
    public Guid? CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public AuthTokensDto Tokens { get; set; } = new();
}

/// <summary>Résultat d'une invitation (le lien/token est renvoyé pour faciliter le dev).</summary>
public class PortalInviteResponseDto
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string InviteToken { get; set; } = string.Empty;
    public string InviteLink { get; set; } = string.Empty;
}
