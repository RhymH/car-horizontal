using System.Reflection;
using System.Text.Json;
using CarHorizontal.Domain.Entities.Catalog;
using CarHorizontal.Domain.Entities.Vehicles;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CarHorizontal.Infrastructure.Catalog.Seed;

public class CatalogSeeder : ICatalogSeeder
{
    private const string EmbeddedResourceName =
        "CarHorizontal.Infrastructure.Catalog.Seed.vehicle-models.json";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    private readonly AppDbContext _db;
    private readonly ILogger<CatalogSeeder> _logger;

    public CatalogSeeder(AppDbContext db, ILogger<CatalogSeeder> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<CatalogSeedReport> SeedFromEmbeddedAsync(CancellationToken ct = default)
    {
        await using var stream = typeof(CatalogSeeder).Assembly
            .GetManifestResourceStream(EmbeddedResourceName)
            ?? throw new InvalidOperationException(
                $"Embedded resource '{EmbeddedResourceName}' not found.");

        var root = await JsonSerializer.DeserializeAsync<CatalogSeedRoot>(stream, JsonOptions, ct)
            ?? throw new InvalidOperationException("Catalog seed root is empty.");

        return await UpsertAsync(root, ct);
    }

    public async Task<CatalogSeedReport> SeedFromFileAsync(string path, CancellationToken ct = default)
    {
        await using var stream = File.OpenRead(path);
        var root = await JsonSerializer.DeserializeAsync<CatalogSeedRoot>(stream, JsonOptions, ct)
            ?? throw new InvalidOperationException("Catalog seed root is empty.");

        return await UpsertAsync(root, ct);
    }

    private async Task<CatalogSeedReport> UpsertAsync(CatalogSeedRoot root, CancellationToken ct)
    {
        var slugs = root.VehicleModels.Select(m => m.Slug).ToList();
        if (slugs.Count != slugs.Distinct().Count())
        {
            throw new InvalidOperationException("Duplicate slug detected in catalog seed.");
        }

        var existing = await _db.VehicleModels
            .IgnoreQueryFilters()
            .Where(m => slugs.Contains(m.Slug))
            .Include(m => m.Programs)
                .ThenInclude(p => p.Items)
            .ToDictionaryAsync(m => m.Slug, ct);

        var models = 0;
        var programs = 0;
        var items = 0;

        foreach (var seedModel in root.VehicleModels)
        {
            ValidateSeedModel(seedModel);

            if (!existing.TryGetValue(seedModel.Slug, out var model))
            {
                model = new VehicleModel { Slug = seedModel.Slug };
                _db.VehicleModels.Add(model);
            }

            ApplyModel(model, seedModel);
            models++;

            programs += UpsertPrograms(model, seedModel.Programs, out var itemsTouched);
            items += itemsTouched;
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Catalog seed applied: {Models} vehicle models, {Programs} programs, {Items} items.",
            models, programs, items);

        return new CatalogSeedReport(models, programs, items);
    }

    private int UpsertPrograms(VehicleModel model, List<CatalogSeedProgram> seeds, out int itemsTouched)
    {
        itemsTouched = 0;
        var existing = model.Programs.ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);

        foreach (var seed in seeds)
        {
            if (!existing.TryGetValue(seed.Name, out var program))
            {
                program = new MaintenanceProgram
                {
                    Name = seed.Name,
                    VehicleModelId = model.Id
                };
                model.Programs.Add(program);
            }

            program.IsDefault = seed.IsDefault;
            program.Source = ParseEnum<MaintenanceProgramSource>(seed.Source, MaintenanceProgramSource.Curated);
            program.SourceReference = seed.SourceReference;

            itemsTouched += UpsertItems(program, seed.Items);
        }

        return seeds.Count;
    }

    private int UpsertItems(MaintenanceProgram program, List<CatalogSeedItem> seeds)
    {
        var byCode = program.Items.ToDictionary(i => i.Code, StringComparer.OrdinalIgnoreCase);

        foreach (var seed in seeds)
        {
            if (!MaintenanceItemCode.IsKnown(seed.Code))
            {
                throw new InvalidOperationException(
                    $"Unknown maintenance item code '{seed.Code}' in catalog seed.");
            }

            if (!byCode.TryGetValue(seed.Code, out var item))
            {
                item = new MaintenanceProgramItem
                {
                    ProgramId = program.Id,
                    Code = seed.Code
                };
                program.Items.Add(item);
            }

            item.Title = seed.Title;
            item.Description = seed.Description;
            item.IntervalMonths = seed.IntervalMonths;
            item.IntervalKm = seed.IntervalKm;
            item.FirstOccurrenceMonths = seed.FirstOccurrenceMonths;
            item.FirstOccurrenceKm = seed.FirstOccurrenceKm;
            item.Trigger = ParseEnum<MaintenanceItemTrigger>(seed.Trigger, MaintenanceItemTrigger.Earliest);
            item.Severity = ParseEnum<MaintenanceItemSeverity>(seed.Severity, MaintenanceItemSeverity.Recommended);
            item.EstimatedDurationMinutes = seed.EstimatedDurationMinutes;
            item.EstimatedCostMin = seed.EstimatedCostMin;
            item.EstimatedCostMax = seed.EstimatedCostMax;
            item.RequiredParts = seed.RequiredParts?.ToArray() ?? Array.Empty<string>();
        }

        return seeds.Count;
    }

    private static void ApplyModel(VehicleModel target, CatalogSeedVehicleModel seed)
    {
        target.Make = seed.Make;
        target.Model = seed.Model;
        target.Trim = seed.Trim;
        target.EngineCode = seed.EngineCode;
        target.EngineDisplayName = seed.EngineDisplayName;
        target.EngineType = ParseEnum<EngineType>(seed.EngineType, EngineType.Gasoline);
        target.FuelType = seed.FuelType;
        target.ProductionStartYear = seed.ProductionStartYear;
        target.ProductionEndYear = seed.ProductionEndYear;
        target.MarketRegion = ParseEnum<VehicleModelMarketRegion>(seed.MarketRegion, VehicleModelMarketRegion.FR);
        target.Aliases = seed.Aliases.ToArray();
    }

    private static void ValidateSeedModel(CatalogSeedVehicleModel seed)
    {
        if (string.IsNullOrWhiteSpace(seed.Slug))
            throw new InvalidOperationException("Vehicle model slug is required.");
        if (string.IsNullOrWhiteSpace(seed.Make) || string.IsNullOrWhiteSpace(seed.Model))
            throw new InvalidOperationException($"Make/Model required for slug '{seed.Slug}'.");
        if (seed.Programs.Count == 0)
            throw new InvalidOperationException($"At least one program required for slug '{seed.Slug}'.");
    }

    private static TEnum ParseEnum<TEnum>(string? value, TEnum fallback) where TEnum : struct
    {
        if (string.IsNullOrWhiteSpace(value)) return fallback;
        return Enum.TryParse<TEnum>(value, ignoreCase: true, out var parsed) ? parsed : fallback;
    }
}
