namespace CarHorizontal.Api.Modules.Auth.Dtos;

public class LoginRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public Guid? OrganizationId { get; set; }
}
