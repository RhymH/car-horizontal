using CarHorizontal.Api.Common;
using CarHorizontal.Api.Modules.Auth;
using CarHorizontal.Api.Modules.Auth.Dtos;
using CarHorizontal.Api.Modules.Portal.Dtos;
using CarHorizontal.Domain.Entities.Identity;
using CarHorizontal.Domain.Entities.Messaging;
using CarHorizontal.Domain.Messaging;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Portal;

public class PortalAuthService : IPortalAuthService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly SignInManager<AppUser> _signInManager;
    private readonly IJwtTokenService _jwt;
    private readonly IRefreshTokenService _refreshTokens;
    private readonly IMessageDispatcher _dispatcher;
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public PortalAuthService(
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        IJwtTokenService jwt,
        IRefreshTokenService refreshTokens,
        IMessageDispatcher dispatcher,
        AppDbContext db,
        IConfiguration config)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwt = jwt;
        _refreshTokens = refreshTokens;
        _dispatcher = dispatcher;
        _db = db;
        _config = config;
    }

    public async Task<PortalInviteResponseDto> InviteAsync(Guid customerId, CancellationToken ct = default)
    {
        // Scoping staff : le filtre global restreint la fiche à l'org courante.
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == customerId, ct)
            ?? throw new KeyNotFoundException("Client introuvable.");

        var email = customer.Email?.Trim();
        if (string.IsNullOrWhiteSpace(email))
            throw new ConflictException("Ce client n'a pas d'email : renseignez-le avant d'inviter.");

        var existing = await _userManager.FindByEmailAsync(email);
        AppUser user;
        if (existing is not null)
        {
            // Ré-invitation autorisée uniquement si c'est déjà le compte client de cette fiche.
            if (existing.UserType != UserType.Customer || existing.CustomerId != customerId)
                throw new ConflictException("Cet email est déjà utilisé par un autre compte.");
            user = existing;
        }
        else
        {
            user = new AppUser
            {
                UserName = email,
                Email = email,
                FullName = customer.FullName,
                EmailConfirmed = true,
                UserType = UserType.Customer,
                CustomerId = customerId
            };
            var create = await _userManager.CreateAsync(user); // sans mot de passe (défini à l'acceptation)
            if (!create.Succeeded)
                throw new ConflictException(string.Join("; ", create.Errors.Select(e => e.Description)));
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var baseUrl = _config["ClientPortal:BaseUrl"] ?? "http://localhost:3001";
        var link = $"{baseUrl}/accept-invite?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";

        // Envoi de l'invitation (sender simulé "log" en dev — voir P0-A).
        await _dispatcher.DispatchAsync(
            MessageChannel.Email, email,
            "Votre accès au suivi de votre véhicule",
            $"Bonjour {customer.FullName}, votre garage vous donne accès au suivi de votre véhicule. " +
            $"Activez votre compte ici : {link}",
            ct);

        return new PortalInviteResponseDto
        {
            UserId = user.Id,
            Email = email,
            InviteToken = token,
            InviteLink = link
        };
    }

    public async Task<PortalSessionResponseDto> AcceptInviteAsync(
        AcceptInviteRequestDto request, string ip, string userAgent, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null || user.UserType != UserType.Customer)
            throw new ConflictException("Invitation invalide.");

        var reset = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!reset.Succeeded)
            throw new ConflictException(string.Join("; ", reset.Errors.Select(e => e.Description)));

        return await IssueSessionAsync(user, ip, userAgent, ct);
    }

    public async Task<PortalSessionResponseDto> LoginAsync(
        PortalLoginRequestDto request, string ip, string userAgent, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        // On ne révèle pas qu'il s'agirait d'un compte staff.
        if (user is null || user.UserType != UserType.Customer)
            throw new InvalidCredentialsException();

        var check = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!check.Succeeded) throw new InvalidCredentialsException();

        return await IssueSessionAsync(user, ip, userAgent, ct);
    }

    private async Task<PortalSessionResponseDto> IssueSessionAsync(
        AppUser user, string ip, string userAgent, CancellationToken ct)
    {
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        // Pas d'organisation pour un client : le token portera user_type=Customer + customer_id.
        var access = _jwt.CreateAccessToken(user, organizationId: null, role: null);
        var refresh = await _refreshTokens.IssueAsync(user.Id, null, ip, userAgent, ct);

        return new PortalSessionResponseDto
        {
            UserId = user.Id,
            CustomerId = user.CustomerId,
            FullName = user.FullName,
            Tokens = new AuthTokensDto
            {
                AccessToken = access.Token,
                AccessTokenExpiresAt = access.ExpiresAt,
                RefreshToken = refresh.RawToken,
                RefreshTokenExpiresAt = refresh.Entity.ExpiresAt
            }
        };
    }
}
