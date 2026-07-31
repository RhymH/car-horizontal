using System.Security.Cryptography;
using CarHorizontal.Domain.Capabilities;
using CarHorizontal.Domain.Entities.Customers;
using CarHorizontal.Domain.Entities.Files;
using CarHorizontal.Domain.Entities.Identity;
using CarHorizontal.Domain.Entities.Leads;
using CarHorizontal.Domain.Entities.Maintenance;
using CarHorizontal.Domain.Entities.Organizations;
using CarHorizontal.Domain.Entities.Sales;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Domain.Entities.Vehicles;
using CarHorizontal.Domain.Files;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SkiaSharp;

namespace CarHorizontal.Infrastructure.Persistence.Seed;

public class DevSeeder
{
    private readonly AppDbContext _db;
    private readonly UserManager<AppUser> _userManager;
    private readonly IImageProcessor _images;
    private readonly ILogger<DevSeeder> _logger;

    public DevSeeder(
        AppDbContext db,
        UserManager<AppUser> userManager,
        IImageProcessor images,
        ILogger<DevSeeder> logger)
    {
        _db = db;
        _userManager = userManager;
        _images = images;
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
        await SeedSalesAsync(ct);
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
    /// Peuple le module Vente : trois dossiers dans trois états différents, pour que
    /// les filtres du stock, la galerie et la mosaïque soient explorables sans saisie
    /// préalable. Idempotent et rejoué à chaque démarrage, donc il rattrape aussi les
    /// bases dev créées avant l'arrivée du module.
    /// </summary>
    private async Task SeedSalesAsync(CancellationToken ct)
    {
        if (await _db.VehicleSaleListings.IgnoreQueryFilters().AnyAsync(l => l.DeletedAt == null, ct))
            return;

        var org = await _db.Organizations.IgnoreQueryFilters()
            .FirstOrDefaultAsync(o => o.Slug == "garage-demo" && o.DeletedAt == null, ct);
        if (org is null) return;

        // Le module est un plugin optionnel, désactivé par défaut : sans cette ligne
        // l'onglet Vente resterait invisible sur la base de démo.
        await EnableSalesCapabilityAsync(org.Id, ct);

        var vehicles = await _db.Vehicles.IgnoreQueryFilters()
            .Where(v => v.OrganizationId == org.Id && v.DeletedAt == null)
            .ToListAsync(ct);

        Vehicle? ByPlate(string plate) =>
            vehicles.FirstOrDefault(v => v.LicensePlate == plate);

        var now = DateTime.UtcNow;

        // ── Dossier 1 : en vente, complet ────────────────────────────────────
        if (ByPlate("BB-222-BB") is { } forSale)
        {
            var listing = new VehicleSaleListing
            {
                OrganizationId = org.Id,
                VehicleId = forSale.Id,
                Status = VehicleSaleStatus.ForSale,
                Title = $"{forSale.Make} {forSale.Model} 1.5 BlueHDi 130 Allure",
                Description = "Deuxième main, carnet d'entretien à jour, distribution faite à 90 000 km. "
                    + "Véhicule non fumeur, pneus avant neufs.",
                Equipment = "Climatisation automatique\nRégulateur adaptatif\nCaméra de recul\nGPS",
                InternalNotes = "Reprise sur l'achat du Model 3 d'Emma Petit.",
                AskingPrice = 13_500m,
                FloorPrice = 12_800m,
                PurchasePrice = 10_500m,
                ReconditioningCost = 900m,
                ListedAt = now.AddDays(-38),
                Origin = "Reprise client",
                OwnersCount = 2,
                KeysCount = 2,
                WarrantyMonths = 6,
                HasServiceBook = true,
                HasRegistrationCertificate = true,
                NonPledgeCertificateAt = now.AddDays(-5)
            };
            _db.VehicleSaleListings.Add(listing);

            // Deux paliers : la courbe d'évolution du prix a besoin d'au moins deux
            // points pour être lisible, et la baisse alimente l'indicateur du bandeau.
            AddPriceChange(listing, 14_900m, null, now.AddDays(-38), "Mise en vente");
            AddPriceChange(listing, 13_500m, 14_900m, now.AddDays(-9),
                "Peu d'appels en trois semaines");

            _db.VehicleSaleChannelPosts.Add(new VehicleSaleChannelPost
            {
                OrganizationId = org.Id,
                ListingId = listing.Id,
                VehicleId = forSale.Id,
                Channel = "leboncoin",
                Url = "https://www.leboncoin.fr/voitures/1234567890.htm",
                Status = SaleChannelPostStatus.Online,
                PublishedAt = now.AddDays(-38),
                // Volontairement resté à l'ancien prix : c'est le cas que l'alerte
                // « prix désynchronisé » doit rendre visible.
                DisplayedPrice = 14_900m
            });
            _db.VehicleSaleChannelPosts.Add(new VehicleSaleChannelPost
            {
                OrganizationId = org.Id,
                ListingId = listing.Id,
                VehicleId = forSale.Id,
                Channel = "La Centrale",
                Url = "https://www.lacentrale.fr/auto-occasion-annonce-12345.html",
                Status = SaleChannelPostStatus.Online,
                PublishedAt = now.AddDays(-30),
                DisplayedPrice = 13_500m
            });

            var buyer = AddProspectBuyer(org.Id, "Julien Moreau", "+33612345678",
                "julien.moreau@example.com", LeadSource.Marketplace);

            _db.VehicleSaleInquiries.Add(new VehicleSaleInquiry
            {
                OrganizationId = org.Id,
                ListingId = listing.Id,
                VehicleId = forSale.Id,
                CustomerId = buyer.Id,
                Channel = SaleInquiryChannel.Marketplace,
                Status = SaleInquiryStatus.OfferMade,
                ReceivedAt = now.AddDays(-6),
                OfferAmount = 12_500m,
                TestDriveAt = now.AddDays(2),
                NextFollowUpAt = now.AddDays(3),
                Notes = "Souhaite un essai samedi matin."
            });

            // Un client de l'atelier peut aussi être acheteur : c'est ce cas qui montre
            // le rattachement à une fiche existante plutôt qu'à un prospect créé.
            var existing = await _db.Customers.IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.OrganizationId == org.Id
                    && c.Email == "chloe@example.com" && c.DeletedAt == null, ct);
            if (existing is not null)
            {
                _db.VehicleSaleInquiries.Add(new VehicleSaleInquiry
                {
                    OrganizationId = org.Id,
                    ListingId = listing.Id,
                    VehicleId = forSale.Id,
                    CustomerId = existing.Id,
                    Channel = SaleInquiryChannel.Phone,
                    Status = SaleInquiryStatus.Contacted,
                    ReceivedAt = now.AddDays(-2),
                    Notes = "Cliente de l'atelier, cherche à remplacer sa C3."
                });
            }

            AddRegistration(org.Id, forSale, now);
            AddPhotos(org.Id, listing, forSale, count: 5);
        }

        // ── Dossier 2 : brouillon, tout juste ouvert ─────────────────────────
        if (ByPlate("DD-444-DD") is { } draft)
        {
            _db.VehicleSaleListings.Add(new VehicleSaleListing
            {
                OrganizationId = org.Id,
                VehicleId = draft.Id,
                Status = VehicleSaleStatus.Draft,
                PurchasePrice = 6_200m,
                ReconditioningCost = 1_400m,
                Origin = "Achat professionnel",
                InternalNotes = "Attente du contrôle technique avant publication.",
                OwnersCount = 3,
                KeysCount = 1
            });
        }

        // ── Dossier 3 : vendu, pour la marge réalisée ────────────────────────
        if (ByPlate("AA-111-AA") is { } sold)
        {
            var listing = new VehicleSaleListing
            {
                OrganizationId = org.Id,
                VehicleId = sold.Id,
                Status = VehicleSaleStatus.Sold,
                Title = $"{sold.Make} {sold.Model} 0.9 TCe 90 Intens",
                AskingPrice = 8_900m,
                FloorPrice = 8_200m,
                PurchasePrice = 6_800m,
                ReconditioningCost = 450m,
                SoldPrice = 8_600m,
                SoldAt = now.AddDays(-12),
                BuyerName = "Famille Rousseau",
                ListedAt = now.AddDays(-70),
                Origin = "Reprise client",
                OwnersCount = 1,
                KeysCount = 2,
                HasServiceBook = true,
                HasRegistrationCertificate = true
            };
            _db.VehicleSaleListings.Add(listing);
            AddPriceChange(listing, 8_900m, null, now.AddDays(-70), "Mise en vente");
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Dev seed: module Vente peuplé (3 dossiers, capability activée).");
    }

    /// <summary>Active le plugin « vente » pour l'organisation de démo, sans doublon.</summary>
    private async Task EnableSalesCapabilityAsync(Guid orgId, CancellationToken ct)
    {
        var row = await _db.OrganizationFeatures.IgnoreQueryFilters()
            .FirstOrDefaultAsync(f => f.OrganizationId == orgId
                && f.Capability == Capabilities.Sales && f.DeletedAt == null, ct);

        if (row is null)
        {
            _db.OrganizationFeatures.Add(new OrganizationFeature
            {
                OrganizationId = orgId,
                Capability = Capabilities.Sales,
                Enabled = true
            });
        }
        else
        {
            row.Enabled = true;
        }

        await _db.SaveChangesAsync(ct);
    }

    private void AddPriceChange(
        VehicleSaleListing listing,
        decimal price,
        decimal? previous,
        DateTime changedAt,
        string reason)
    {
        _db.VehicleSalePriceChanges.Add(new VehicleSalePriceChange
        {
            OrganizationId = listing.OrganizationId,
            ListingId = listing.Id,
            VehicleId = listing.VehicleId,
            Price = price,
            PreviousPrice = previous,
            ChangedAt = changedAt,
            Reason = reason
        });
    }

    /// <summary>Crée un acheteur en prospect, avec son entrée de pipeline.</summary>
    private Customer AddProspectBuyer(
        Guid orgId,
        string fullName,
        string phone,
        string email,
        LeadSource source)
    {
        var customer = new Customer
        {
            OrganizationId = orgId,
            FullName = fullName,
            Phone = phone,
            Email = email,
            Status = CustomerStatus.Prospect
        };
        _db.Customers.Add(customer);

        _db.LeadProfiles.Add(new LeadProfile
        {
            OrganizationId = orgId,
            CustomerId = customer.Id,
            Stage = LeadStage.New,
            Source = source,
            InterestSummary = "Acheteur véhicule"
        });

        return customer;
    }

    /// <summary>
    /// Carte grise du véhicule vitrine. Le VIN reste volontairement absent de la
    /// fiche véhicule : l'encart « il manque encore… » a besoin d'un manque réel
    /// pour être démontrable.
    /// </summary>
    private void AddRegistration(Guid orgId, Vehicle vehicle, DateTime now)
    {
        _db.VehicleRegistrationDetails.Add(new VehicleRegistrationDetail
        {
            OrganizationId = orgId,
            VehicleId = vehicle.Id,
            FirstRegisteredAt = new DateTime(2019, 3, 14, 0, 0, 0, DateTimeKind.Utc),
            CertificateFormulaNumber = "2019AB12345",
            HolderName = "Benoît Martin",
            HolderAddress = "12 rue des Lilas, 13001 Marseille",
            TypeVariantVersion = "MCPSHM/S6",
            NationalTypeCode = "M10PEUVP0042",
            CommercialName = "308",
            TypeApprovalNumber = "e2*2007/46*0521*12",
            EuCategory = "M1",
            NationalGenre = "VP",
            NationalBodyType = "BERLINE",
            TechnicallyPermissibleMaxMassKg = 1_890,
            MassInServiceKg = 1_320,
            EngineDisplacementCm3 = 1_499,
            MaxNetPowerKw = 96m,
            FuelCode = "GO",
            FiscalHorsepower = 6,
            SeatingCapacity = 5,
            Co2GramsPerKm = 108,
            EmissionClass = "EURO 6",
            LastTechnicalInspectionAt = now.AddMonths(-2)
        });
    }

    /// <summary>
    /// Génère des photos d'annonce de démonstration. Les visuels sont produits à la
    /// volée plutôt que livrés en ressources binaires : le dépôt reste léger, et les
    /// images passent par la même compression que de vraies photos, ce qui rend
    /// crédibles les statistiques « poids économisé » de la galerie.
    /// </summary>
    private void AddPhotos(Guid orgId, VehicleSaleListing listing, Vehicle vehicle, int count)
    {
        var folder = new FileFolder { OrganizationId = orgId, Name = "Annonces" };
        _db.FileFolders.Add(folder);

        for (var i = 0; i < count; i++)
        {
            var source = CreatePlaceholderPhoto(i);
            var full = _images.Compress(source, 1920, 80);
            var thumb = _images.Compress(source, 480, 70);

            var fullFile = AddStoredFile(orgId, folder.Id, $"{vehicle.Model}-{i + 1}.jpg", full.Content);
            var thumbFile = AddStoredFile(orgId, folder.Id, $"{vehicle.Model}-{i + 1}-thumb.jpg", thumb.Content);

            _db.VehicleSalePhotos.Add(new VehicleSalePhoto
            {
                OrganizationId = orgId,
                ListingId = listing.Id,
                VehicleId = vehicle.Id,
                StoredFileId = fullFile.Id,
                ThumbnailFileId = thumbFile.Id,
                SortOrder = i,
                IsPrimary = i == 0,
                Width = full.Width,
                Height = full.Height,
                SizeBytes = full.Content.LongLength,
                OriginalSizeBytes = source.LongLength,
                OriginalFileName = $"{vehicle.Model}-{i + 1}.jpg"
            });
        }
    }

    private StoredFile AddStoredFile(Guid orgId, Guid folderId, string fileName, byte[] content)
    {
        var file = new StoredFile
        {
            OrganizationId = orgId,
            FolderId = folderId,
            OriginalFileName = fileName,
            ContentType = "image/jpeg",
            SizeBytes = content.LongLength,
            BinaryContent = content,
            Sha256 = Convert.ToHexString(SHA256.HashData(content)).ToLowerInvariant()
        };
        _db.StoredFiles.Add(file);
        return file;
    }

    /// <summary>
    /// Dessine un visuel de substitution en 2400×1600. Volontairement sans texte :
    /// le rendu de police dépendrait de fontconfig, absent de l'image Docker Linux
    /// que nous utilisons. Formes et dégradés suffisent à distinguer les photos.
    /// </summary>
    private static byte[] CreatePlaceholderPhoto(int index)
    {
        const int width = 2400;
        const int height = 1600;

        var palette = new[]
        {
            (new SKColor(0x1F, 0x3A, 0x5F), new SKColor(0x4C, 0x7A, 0xA8)),
            (new SKColor(0x3B, 0x2F, 0x2F), new SKColor(0x8C, 0x6E, 0x5A)),
            (new SKColor(0x22, 0x3B, 0x2E), new SKColor(0x5C, 0x8D, 0x6E)),
            (new SKColor(0x40, 0x33, 0x1A), new SKColor(0xC1, 0x93, 0x3B)),
            (new SKColor(0x2E, 0x25, 0x3F), new SKColor(0x76, 0x5F, 0x9E))
        };
        var (top, bottom) = palette[index % palette.Length];

        using var surface = SKSurface.Create(
            new SKImageInfo(width, height, SKColorType.Rgba8888, SKAlphaType.Opaque));
        var canvas = surface.Canvas;

        using (var background = new SKPaint
        {
            Shader = SKShader.CreateLinearGradient(
                new SKPoint(0, 0),
                new SKPoint(0, height),
                new[] { top, bottom },
                SKShaderTileMode.Clamp)
        })
        {
            canvas.DrawRect(new SKRect(0, 0, width, height), background);
        }

        // Bandes obliques décalées selon l'index : deux photos consécutives ne se
        // ressemblent pas, ce qui rend l'ordre de la galerie visible d'un coup d'œil.
        using var stripe = new SKPaint { Color = SKColors.White.WithAlpha(26), IsAntialias = true };
        for (var i = 0; i < 6; i++)
        {
            var offset = (index * 140) + (i * 420);
            using var path = new SKPath();
            path.MoveTo(offset, height);
            path.LineTo(offset + 260, height);
            path.LineTo(offset + 760, 0);
            path.LineTo(offset + 500, 0);
            path.Close();
            canvas.DrawPath(path, stripe);
        }

        using var disc = new SKPaint { Color = SKColors.White.WithAlpha(38), IsAntialias = true };
        canvas.DrawCircle(width * 0.72f, height * 0.34f, 230 + index * 26, disc);

        canvas.Flush();

        using var image = surface.Snapshot();
        // Qualité volontairement haute : c'est la photo « brute » avant compression,
        // celle dont le poids sert de référence à l'indicateur de la galerie.
        using var data = image.Encode(SKEncodedImageFormat.Jpeg, 95);
        return data.ToArray();
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
