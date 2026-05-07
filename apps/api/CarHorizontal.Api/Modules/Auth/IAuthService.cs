using CarHorizontal.Api.Modules.Auth.Dtos;

namespace CarHorizontal.Api.Modules.Auth;

public interface IAuthService
{
    Task<RegisterResponseDto> RegisterAsync(RegisterRequestDto request, string ip, string userAgent, CancellationToken ct = default);
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request, string ip, string userAgent, CancellationToken ct = default);
    Task<RefreshResponseDto> RefreshAsync(RefreshRequestDto request, string ip, string userAgent, CancellationToken ct = default);
    Task LogoutAsync(LogoutRequestDto request, CancellationToken ct = default);
    Task<SwitchOrgResponseDto> SwitchOrgAsync(Guid userId, SwitchOrgRequestDto request, string ip, string userAgent, CancellationToken ct = default);
    Task<MeResponseDto> GetMeAsync(Guid userId, Guid? activeOrgId, CancellationToken ct = default);
}
