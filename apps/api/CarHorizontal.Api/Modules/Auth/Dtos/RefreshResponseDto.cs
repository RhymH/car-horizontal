namespace CarHorizontal.Api.Modules.Auth.Dtos;

public class RefreshResponseDto
{
    public AuthTokensDto Tokens { get; set; } = new();
}
