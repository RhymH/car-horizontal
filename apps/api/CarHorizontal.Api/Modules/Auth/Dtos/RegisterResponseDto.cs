namespace CarHorizontal.Api.Modules.Auth.Dtos;

public class RegisterResponseDto
{
    public Guid UserId { get; set; }
    public Guid OrganizationId { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
    public string OrganizationSlug { get; set; } = string.Empty;
    public AuthTokensDto Tokens { get; set; } = new();
}
