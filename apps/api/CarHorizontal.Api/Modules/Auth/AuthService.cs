using CarHorizontal.Api.Modules.Auth.Dtos;
using CarHorizontal.Api.Modules.Organizations;
using CarHorizontal.Domain.Entities.Identity;
using CarHorizontal.Domain.Entities.Organizations;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Auth;

public class AuthService : IAuthService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly SignInManager<AppUser> _signInManager;
    private readonly IJwtTokenService _jwt;
    private readonly IRefreshTokenService _refreshTokens;
    private readonly IOrganizationService _organizations;
    private readonly AppDbContext _db;

    public AuthService(
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        IJwtTokenService jwt,
        IRefreshTokenService refreshTokens,
        IOrganizationService organizations,
        AppDbContext db)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwt = jwt;
        _refreshTokens = refreshTokens;
        _organizations = organizations;
        _db = db;
    }

    public async Task<RegisterResponseDto> RegisterAsync(
        RegisterRequestDto request,
        string ip,
        string userAgent,
        CancellationToken ct = default)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing is not null) throw new UserAlreadyExistsException(request.Email);

        await using var transaction = await _db.Database.BeginTransactionAsync(ct);

        var user = new AppUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            EmailConfirmed = true
        };

        var create = await _userManager.CreateAsync(user, request.Password);
        if (!create.Succeeded)
        {
            var msg = string.Join("; ", create.Errors.Select(e => $"{e.Code}: {e.Description}"));
            throw new AuthException($"Failed to create user: {msg}");
        }

        Organization org;
        AuthTokensDto tokens;
        try
        {
            org = await _organizations.CreateForOwnerAsync(user.Id, request.FullName, ct);
            tokens = await IssueTokensAsync(user, org.Id, OrganizationRole.Owner.ToString(), ip, userAgent, ct);
            await transaction.CommitAsync(ct);
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }

        return new RegisterResponseDto
        {
            UserId = user.Id,
            OrganizationId = org.Id,
            OrganizationName = org.Name,
            OrganizationSlug = org.Slug,
            Tokens = tokens
        };
    }

    public async Task<LoginResponseDto> LoginAsync(
        LoginRequestDto request,
        string ip,
        string userAgent,
        CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null) throw new InvalidCredentialsException();

        var check = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!check.Succeeded) throw new InvalidCredentialsException();

        var memberships = await _db.UserOrganizations
            .Where(uo => uo.UserId == user.Id)
            .ToListAsync(ct);

        UserOrganization? active = null;
        if (request.OrganizationId.HasValue)
        {
            active = memberships.FirstOrDefault(m => m.OrganizationId == request.OrganizationId.Value)
                ?? throw new OrganizationMembershipException();
        }
        else
        {
            active = memberships.FirstOrDefault();
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var tokens = await IssueTokensAsync(user, active?.OrganizationId, active?.Role.ToString(), ip, userAgent, ct);

        return new LoginResponseDto
        {
            UserId = user.Id,
            ActiveOrganizationId = active?.OrganizationId,
            Tokens = tokens
        };
    }

    public async Task<RefreshResponseDto> RefreshAsync(
        RefreshRequestDto request,
        string ip,
        string userAgent,
        CancellationToken ct = default)
    {
        var existing = await _refreshTokens.FindActiveAsync(request.RefreshToken, ct)
            ?? throw new InvalidRefreshTokenException();

        var user = await _userManager.FindByIdAsync(existing.UserId.ToString())
            ?? throw new InvalidRefreshTokenException();

        UserOrganization? active = null;
        if (existing.OrganizationId.HasValue)
        {
            active = await _db.UserOrganizations
                .FirstOrDefaultAsync(m => m.UserId == user.Id && m.OrganizationId == existing.OrganizationId.Value, ct);
        }

        var rotated = await _refreshTokens.RotateAsync(existing, active?.OrganizationId, ip, userAgent, ct);
        var access = _jwt.CreateAccessToken(user, active?.OrganizationId, active?.Role.ToString());

        return new RefreshResponseDto
        {
            Tokens = new AuthTokensDto
            {
                AccessToken = access.Token,
                AccessTokenExpiresAt = access.ExpiresAt,
                RefreshToken = rotated.RawToken,
                RefreshTokenExpiresAt = rotated.Entity.ExpiresAt
            }
        };
    }

    public async Task LogoutAsync(LogoutRequestDto request, CancellationToken ct = default)
    {
        var existing = await _refreshTokens.FindActiveAsync(request.RefreshToken, ct);
        if (existing is null) return;
        await _refreshTokens.RevokeAsync(existing, ct);
    }

    public async Task<SwitchOrgResponseDto> SwitchOrgAsync(
        Guid userId,
        SwitchOrgRequestDto request,
        string ip,
        string userAgent,
        CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new InvalidCredentialsException();

        var membership = await _db.UserOrganizations
            .FirstOrDefaultAsync(m => m.UserId == userId && m.OrganizationId == request.OrganizationId, ct)
            ?? throw new OrganizationMembershipException();

        var issued = await IssueTokensAsync(user, membership.OrganizationId, membership.Role.ToString(), ip, userAgent, ct);

        return new SwitchOrgResponseDto
        {
            ActiveOrganizationId = membership.OrganizationId,
            Tokens = issued
        };
    }

    public async Task<MeResponseDto> GetMeAsync(Guid userId, Guid? activeOrgId, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new InvalidCredentialsException();

        var memberships = await (
            from uo in _db.UserOrganizations
            join o in _db.Organizations.IgnoreQueryFilters() on uo.OrganizationId equals o.Id
            where uo.UserId == userId
            select new MeOrganizationDto
            {
                OrganizationId = o.Id,
                Name = o.Name,
                Slug = o.Slug,
                Role = uo.Role.ToString()
            }).ToListAsync(ct);

        return new MeResponseDto
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            ActiveOrganizationId = activeOrgId,
            Organizations = memberships
        };
    }

    private async Task<AuthTokensDto> IssueTokensAsync(
        AppUser user,
        Guid? orgId,
        string? role,
        string ip,
        string userAgent,
        CancellationToken ct)
    {
        var access = _jwt.CreateAccessToken(user, orgId, role);
        var refresh = await _refreshTokens.IssueAsync(user.Id, orgId, ip, userAgent, ct);

        return new AuthTokensDto
        {
            AccessToken = access.Token,
            AccessTokenExpiresAt = access.ExpiresAt,
            RefreshToken = refresh.RawToken,
            RefreshTokenExpiresAt = refresh.Entity.ExpiresAt
        };
    }
}
