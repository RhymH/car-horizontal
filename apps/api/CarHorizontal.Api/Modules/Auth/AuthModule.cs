using System.Text;
using CarHorizontal.Api.Modules.Organizations;
using CarHorizontal.Domain.Entities.Identity;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace CarHorizontal.Api.Modules.Auth;

public static class AuthModule
{
    public static IServiceCollection AddCarHorizontalAuth(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        services
            .AddIdentity<AppUser, IdentityRole<Guid>>(options =>
            {
                options.Password.RequiredLength = PasswordPolicy.MinLength;
                options.Password.RequireDigit = PasswordPolicy.RequireDigit;
                options.Password.RequireLowercase = PasswordPolicy.RequireLowercase;
                options.Password.RequireUppercase = PasswordPolicy.RequireUppercase;
                options.Password.RequireNonAlphanumeric = PasswordPolicy.RequireNonAlphanumeric;

                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);

                options.User.RequireUniqueEmail = true;

                options.SignIn.RequireConfirmedEmail = false;
                options.SignIn.RequireConfirmedAccount = false;
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IRefreshTokenService, RefreshTokenService>();
        services.AddScoped<IOrganizationService, OrganizationService>();
        services.AddScoped<IAuthService, AuthService>();

        var jwt = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
            ?? throw new InvalidOperationException("Jwt configuration section is missing.");

        if (string.IsNullOrWhiteSpace(jwt.Key) || jwt.Key.Length < 32)
        {
            throw new InvalidOperationException("Jwt:Key must be configured and at least 32 characters long.");
        }

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key));

        services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = false;
                options.SaveToken = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = signingKey,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub,
                    RoleClaimType = System.Security.Claims.ClaimTypes.Role
                };
            });

        var customerType = UserType.Customer.ToString();
        services.AddAuthorization(options =>
        {
            // Policy par défaut (tout [Authorize] sans policy nommée) : authentifié
            // ET pas un compte client → protège l'ensemble des routes staff
            // existantes d'un token client, sans toucher chaque contrôleur.
            options.DefaultPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .RequireAssertion(ctx => ctx.User.FindFirst("user_type")?.Value != customerType)
                .Build();

            options.AddPolicy(AuthPolicies.StaffOnly, p => p
                .RequireAuthenticatedUser()
                .RequireAssertion(ctx => ctx.User.FindFirst("user_type")?.Value != customerType));

            options.AddPolicy(AuthPolicies.CustomerOnly, p => p
                .RequireAuthenticatedUser()
                .RequireAssertion(ctx => ctx.User.FindFirst("user_type")?.Value == customerType));
        });

        return services;
    }
}
