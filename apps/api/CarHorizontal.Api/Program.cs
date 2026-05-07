using CarHorizontal.Api.Common;
using CarHorizontal.Api.Modules.Auth;
using CarHorizontal.Infrastructure;
using CarHorizontal.Infrastructure.Persistence;
using CarHorizontal.Infrastructure.Persistence.Seed;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.AddCarHorizontalInfrastructure(builder.Configuration);
builder.Services.AddCarHorizontalAuth(builder.Configuration);

builder.Services.AddScoped<DevSeeder>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (builder.Configuration.GetValue<bool>("Database:RunMigrationsOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    if (app.Environment.IsDevelopment())
    {
        var seeder = scope.ServiceProvider.GetRequiredService<DevSeeder>();
        var demoPassword = builder.Configuration["Seed:DemoUserPassword"] ?? "DemoUser!2026";
        await seeder.SeedAsync(demoPassword);
    }
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
