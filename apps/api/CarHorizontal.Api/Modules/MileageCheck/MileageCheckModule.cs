using CarHorizontal.Api.Modules.Auth;
using Microsoft.Extensions.Options;

namespace CarHorizontal.Api.Modules.MileageCheck;

public static class MileageCheckModule
{
    public static IServiceCollection AddCarHorizontalMileageCheck(this IServiceCollection services)
    {
        services.AddSingleton<MileageCheckTokens>(sp =>
        {
            var jwt = sp.GetRequiredService<IOptions<JwtOptions>>().Value;
            // Derive a dedicated secret by prefixing the JWT key. Avoids
            // sharing the exact same material between two unrelated channels.
            var secret = "mileage-check::" + jwt.Key;
            return new MileageCheckTokens(secret);
        });
        services.AddScoped<IMileageCheckService, MileageCheckService>();
        return services;
    }
}
