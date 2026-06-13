using CarHorizontal.Api.Modules.Portal.Dtos;

namespace CarHorizontal.Api.Modules.Portal;

public interface IPortalAuthService
{
    /// <summary>Staff : crée (ou ré-invite) le compte client rattaché à une fiche Customer.</summary>
    Task<PortalInviteResponseDto> InviteAsync(Guid customerId, CancellationToken ct = default);

    /// <summary>Client : définit son mot de passe via le token d'invitation, puis ouvre une session.</summary>
    Task<PortalSessionResponseDto> AcceptInviteAsync(AcceptInviteRequestDto request, string ip, string userAgent, CancellationToken ct = default);

    /// <summary>Client : connexion email + mot de passe.</summary>
    Task<PortalSessionResponseDto> LoginAsync(PortalLoginRequestDto request, string ip, string userAgent, CancellationToken ct = default);
}
