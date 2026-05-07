namespace CarHorizontal.Api.Modules.Auth.Dtos;

public class SwitchOrgResponseDto
{
    public Guid ActiveOrganizationId { get; set; }
    public AuthTokensDto Tokens { get; set; } = new();
}
