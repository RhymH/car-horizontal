namespace CarHorizontal.Infrastructure.Catalog.Seed;

public interface ICatalogSeeder
{
    Task<CatalogSeedReport> SeedFromEmbeddedAsync(CancellationToken ct = default);

    Task<CatalogSeedReport> SeedFromFileAsync(string path, CancellationToken ct = default);
}

public sealed record CatalogSeedReport(int ModelsUpserted, int ProgramsUpserted, int ItemsUpserted);
