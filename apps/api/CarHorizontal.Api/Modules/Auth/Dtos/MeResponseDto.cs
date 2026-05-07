namespace CarHorizontal.Api.Modules.Auth.Dtos;

public class MeResponseDto
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public Guid? ActiveOrganizationId { get; set; }
    public List<MeOrganizationDto> Organizations { get; set; } = new();
}

public class MeOrganizationDto
{
    public Guid OrganizationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}
