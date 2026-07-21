using CarHorizontal.Domain.Entities.Customers;
using CarHorizontal.Domain.Entities.Identity;
using CarHorizontal.Domain.Entities.Maintenance;
using CarHorizontal.Domain.Entities.Organizations;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Domain.Entities.Vehicles;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CarHorizontal.Infrastructure.Persistence.Seed;

public class DevSeeder
{
    private readonly AppDbContext _db;
    private readonly UserManager<AppUser> _userManager;
    private readonly ILogger<DevSeeder> _logger;

    public DevSeeder(AppDbContext db, UserManager<AppUser> userManager, ILogger<DevSeeder> logger)
    {
        _db = db;
        _userManager = userManager;
        _logger = logger;
    }

    /// <summary>Email de la fiche client utilisée pour la démo du portail client.</summary>
    private const string ClientPortalDemoEmail = "alice@example.com";

    public async Task SeedAsync(string demoPassword, string clientPassword, CancellationToken ct = default)
    {
        if (await _db.Organizations.IgnoreQueryFilters().AnyAsync(ct))
            _logger.LogInformation("Dev seed skipped — data already present.");
        else
            await SeedGarageAsync(demoPassword, ct);

        await EnsureDemoBrandingAsync(ct);
        await SeedClientPortalUserAsync(clientPassword, ct);
    }

    /// <summary>
    /// Backfill idempotent de la marque blanche du garage de démo (placeholders),
    /// pour les bases dev créées avant l'arrivée du theming portail client.
    /// </summary>
    private async Task EnsureDemoBrandingAsync(CancellationToken ct)
    {
        var org = await _db.Organizations.IgnoreQueryFilters()
            .FirstOrDefaultAsync(o => o.Slug == "garage-demo" && o.DeletedAt == null, ct);
        if (org is null || org.BrandPrimaryColor is not null) return;

        org.BrandPrimaryColor = "#c9a227";
        org.BrandLogoUrl = "https://placehold.co/320x96/0b0d10/c9a227.png?text=GARAGE+DEMO&font=playfair-display";
        org.BrandCoverImageUrl = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1920&auto=format&fit=crop";
        org.BrandTagline = "L'excellence automobile, à votre service depuis 1987";
        org.ContactPhone = "+33 3 89 00 00 00";
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Dev seed: branding placeholders appliqués au garage de démo.");
    }

    private async Task SeedGarageAsync(string demoPassword, CancellationToken ct)
    {
        _logger.LogInformation("Seeding dev data…");

        var org = new Organization
        {
            Name = "Garage Démo",
            Slug = "garage-demo"
        };
        _db.Organizations.Add(org);
        await _db.SaveChangesAsync(ct);

        var owner = new AppUser
        {
            UserName = "demo@carhorizontal.fr",
            Email = "demo@carhorizontal.fr",
            EmailConfirmed = true,
            FullName = "Démo Owner"
        };
        var createResult = await _userManager.CreateAsync(owner, demoPassword);
        if (!createResult.Succeeded)
        {
            var errors = string.Join("; ", createResult.Errors.Select(e => $"{e.Code}: {e.Description}"));
            throw new InvalidOperationException($"Failed to create demo user: {errors}");
        }

        _db.UserOrganizations.Add(new UserOrganization
        {
            UserId = owner.Id,
            OrganizationId = org.Id,
            Role = OrganizationRole.Owner
        });

        var customers = new[]
        {
            new Customer { OrganizationId = org.Id, FullName = "Alice Dupont",   Email = "alice@example.com",   Phone = "+33611111111", City = "Lyon",       PostalCode = "69001" },
            new Customer { OrganizationId = org.Id, FullName = "Benoît Martin",  Email = "benoit@example.com",  Phone = "+33622222222", City = "Marseille",  PostalCode = "13001" },
            new Customer { OrganizationId = org.Id, FullName = "Chloé Bernard",  Email = "chloe@example.com",   Phone = "+33633333333", City = "Toulouse",   PostalCode = "31000" },
            new Customer { OrganizationId = org.Id, FullName = "David Leroy",    Email = "david@example.com",   Phone = "+33644444444", City = "Bordeaux",   PostalCode = "33000" },
            new Customer { OrganizationId = org.Id, FullName = "Emma Petit",     Email = "emma@example.com",    Phone = "+33655555555", City = "Nantes",     PostalCode = "44000" }
        };
        _db.Customers.AddRange(customers);

        var vehicleTemplates = new (string Make, string Model, int Year, string Plate, EngineType Engine, int Mileage)[]
        {
            ("Renault",   "Clio IV",   2018, "AA-111-AA", EngineType.Gasoline, 78_000),
            ("Peugeot",   "308",       2019, "BB-222-BB", EngineType.Diesel,   95_000),
            ("Citroën",   "C3",        2021, "CC-333-CC", EngineType.Gasoline, 32_000),
            ("Volkswagen","Golf",      2017, "DD-444-DD", EngineType.Diesel,  120_000),
            ("Tesla",     "Model 3",   2022, "EE-555-EE", EngineType.Electric, 18_000)
        };

        var vehicles = customers
            .Zip(vehicleTemplates, (c, t) => new Vehicle
            {
                OrganizationId = org.Id,
                CustomerId = c.Id,
                Make = t.Make,
                Model = t.Model,
                Year = t.Year,
                LicensePlate = t.Plate,
                EngineType = t.Engine,
                CurrentMileage = t.Mileage,
                MileageUpdatedAt = DateTime.UtcNow
            })
            .ToArray();
        _db.Vehicles.AddRange(vehicles);

        var now = DateTime.UtcNow;
        foreach (var v in vehicles)
        {
            _db.MaintenanceRecords.Add(new MaintenanceRecord
            {
                OrganizationId = org.Id,
                VehicleId = v.Id,
                PerformedAt = now.AddMonths(-6),
                MileageAtService = Math.Max(0, v.CurrentMileage - 8_000),
                Type = MaintenanceType.Oil,
                Description = "Vidange + filtre huile",
                Cost = 89.00m,
                MechanicName = "Démo Owner"
            });

            _db.TimelineEvents.Add(new TimelineEvent
            {
                OrganizationId = org.Id,
                VehicleId = v.Id,
                CustomerId = v.CustomerId,
                Kind = TimelineEventKind.Maintenance,
                DueAt = now.AddMonths(3),
                Status = TimelineEventStatus.Pending,
                Source = TimelineEventSource.AutoGenerated,
                Title = "Prochaine vidange",
                Description = "Vidange estimée dans ~3 mois selon le kilométrage moyen."
            });
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Dev seed complete: 1 org, 1 owner, {CustomerCount} customers, {VehicleCount} vehicles.",
            customers.Length, vehicles.Length);
    }

    /// <summary>
    /// Crée le compte de connexion du portail client pour la fiche démo, sans passer par
    /// le flux d'invitation. Idempotent : ré-exécuté à chaque démarrage, y compris sur une
    /// base déjà seedée avant l'existence du portail client.
    /// </summary>
    private async Task SeedClientPortalUserAsync(string clientPassword, CancellationToken ct)
    {
        if (await _userManager.FindByEmailAsync(ClientPortalDemoEmail) is not null)
            return;

        var customer = await _db.Customers.IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Email == ClientPortalDemoEmail && c.DeletedAt == null, ct);
        if (customer is null)
        {
            _logger.LogWarning("Client portal seed skipped — no customer with email {Email}.", ClientPortalDemoEmail);
            return;
        }

        var user = new AppUser
        {
            UserName = ClientPortalDemoEmail,
            Email = ClientPortalDemoEmail,
            EmailConfirmed = true,
            FullName = customer.FullName,
            UserType = UserType.Customer,
            CustomerId = customer.Id
        };
        var createResult = await _userManager.CreateAsync(user, clientPassword);
        if (!createResult.Succeeded)
        {
            var errors = string.Join("; ", createResult.Errors.Select(e => $"{e.Code}: {e.Description}"));
            throw new InvalidOperationException($"Failed to create client portal user: {errors}");
        }

        _logger.LogInformation("Client portal demo user created: {Email}.", ClientPortalDemoEmail);
    }
}
