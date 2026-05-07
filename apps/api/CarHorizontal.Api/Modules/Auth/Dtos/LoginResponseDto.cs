namespace CarHorizontal.Api.Modules.Auth.Dtos;

public class LoginResponseDto
{
    public Guid UserId { get; set; }
    public Guid? ActiveOrganizationId { get; set; }
    public AuthTokensDto Tokens { get; set; } = new();
}
