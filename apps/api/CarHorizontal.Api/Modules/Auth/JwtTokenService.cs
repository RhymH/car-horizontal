using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CarHorizontal.Domain.Entities.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CarHorizontal.Api.Modules.Auth;

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;
    private readonly SigningCredentials _signingCredentials;
    private readonly TokenValidationParameters _validationParameters;

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;

        if (string.IsNullOrWhiteSpace(_options.Key) || _options.Key.Length < 32)
        {
            throw new InvalidOperationException("Jwt:Key must be configured and at least 32 characters long.");
        }

        var keyBytes = Encoding.UTF8.GetBytes(_options.Key);
        var securityKey = new SymmetricSecurityKey(keyBytes);
        _signingCredentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        _validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = _options.Issuer,
            ValidateAudience = true,
            ValidAudience = _options.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = securityKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = JwtRegisteredClaimNames.Sub,
            RoleClaimType = ClaimTypes.Role
        };
    }

    public TokenValidationParameters GetValidationParameters() => _validationParameters;

    public AccessTokenResult CreateAccessToken(AppUser user, Guid? organizationId, string? role)
    {
        var jti = Guid.NewGuid().ToString("N");
        var expires = DateTime.UtcNow.AddMinutes(_options.AccessMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, jti),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            // Distingue staff et client final ; exploité par les policies StaffOnly/CustomerOnly.
            new("user_type", user.UserType.ToString())
        };

        if (user.CustomerId.HasValue)
        {
            claims.Add(new Claim("customer_id", user.CustomerId.Value.ToString()));
        }

        if (organizationId.HasValue)
        {
            claims.Add(new Claim("org_id", organizationId.Value.ToString()));
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expires,
            signingCredentials: _signingCredentials);

        var encoded = new JwtSecurityTokenHandler().WriteToken(token);
        return new AccessTokenResult(encoded, expires, jti);
    }

    public ClaimsPrincipal? ValidateAccessToken(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(token, _validationParameters, out _);
            return principal;
        }
        catch
        {
            return null;
        }
    }
}
