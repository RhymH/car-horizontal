using CarHorizontal.Api.Modules.Catalog.Dtos;
using CarHorizontal.Domain.Entities.Catalog;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Catalog;

public class CatalogService : ICatalogService
{
    private readonly AppDbContext _db;

    public CatalogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<VehicleModelListResponseDto> ListAsync(
        string? query,
        string? make,
        string? fuel,
        int? yearAt,
        int page,
        int pageSize,
        CancellationToken ct)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.VehicleModels
            .IgnoreQueryFilters()
            .Where(m => m.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(make))
        {
            q = q.Where(m => EF.Functions.ILike(m.Make, make));
        }

        if (!string.IsNullOrWhiteSpace(fuel))
        {
            q = q.Where(m => EF.Functions.ILike(m.FuelType, fuel));
        }

        if (yearAt.HasValue)
        {
            q = q.Where(m => m.ProductionStartYear <= yearAt.Value
                && (m.ProductionEndYear == null || m.ProductionEndYear >= yearAt.Value));
        }

        if (!string.IsNullOrWhiteSpace(query))
        {
            var pattern = $"%{query}%";
            q = q.Where(m =>
                EF.Functions.ILike(m.Make, pattern)
                || EF.Functions.ILike(m.Model, pattern)
                || EF.Functions.ILike(m.EngineDisplayName, pattern)
                || (m.Trim != null && EF.Functions.ILike(m.Trim, pattern))
                || m.Aliases.Any(a => EF.Functions.ILike(a, pattern)));
        }

        var total = await q.CountAsync(ct);

        var items = await q
            .OrderBy(m => m.Make)
            .ThenBy(m => m.Model)
            .ThenBy(m => m.ProductionStartYear)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(m => m.Programs)
                .ThenInclude(p => p.Items)
            .ToListAsync(ct);

        return new VehicleModelListResponseDto
        {
            Page = page,
            PageSize = pageSize,
            Total = total,
            Items = items.Select(MapList).ToList()
        };
    }

    public async Task<VehicleModelDetailDto?> GetAsync(Guid id, CancellationToken ct)
    {
        var model = await _db.VehicleModels
            .IgnoreQueryFilters()
            .Where(m => m.Id == id && m.DeletedAt == null)
            .Include(m => m.Programs.Where(p => p.DeletedAt == null))
                .ThenInclude(p => p.Items)
            .FirstOrDefaultAsync(ct);

        if (model is null) return null;

        return new VehicleModelDetailDto
        {
            Id = model.Id,
            Slug = model.Slug,
            Make = model.Make,
            Model = model.Model,
            Trim = model.Trim,
            EngineDisplayName = model.EngineDisplayName,
            EngineType = model.EngineType.ToString(),
            FuelType = model.FuelType,
            ProductionStartYear = model.ProductionStartYear,
            ProductionEndYear = model.ProductionEndYear,
            DisplayName = model.DisplayName,
            Aliases = model.Aliases,
            Programs = model.Programs
                .OrderByDescending(p => p.IsDefault)
                .ThenBy(p => p.Name)
                .Select(p => new MaintenanceProgramDetailDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    IsDefault = p.IsDefault,
                    Source = p.Source.ToString(),
                    Items = p.Items
                        .OrderByDescending(i => (int)i.Severity == 0) // Critical first
                        .ThenBy(i => i.IntervalKm ?? int.MaxValue)
                        .Select(i => new MaintenanceProgramItemDto
                        {
                            Id = i.Id,
                            Code = i.Code,
                            Title = i.Title,
                            Description = i.Description,
                            IntervalMonths = i.IntervalMonths,
                            IntervalKm = i.IntervalKm,
                            Trigger = i.Trigger.ToString(),
                            Severity = i.Severity.ToString(),
                            EstimatedCostMin = i.EstimatedCostMin,
                            EstimatedCostMax = i.EstimatedCostMax
                        }).ToList()
                }).ToList()
        };
    }

    private static VehicleModelListItemDto MapList(VehicleModel m) => new()
    {
        Id = m.Id,
        Slug = m.Slug,
        Make = m.Make,
        Model = m.Model,
        Trim = m.Trim,
        EngineDisplayName = m.EngineDisplayName,
        EngineType = m.EngineType.ToString(),
        FuelType = m.FuelType,
        ProductionStartYear = m.ProductionStartYear,
        ProductionEndYear = m.ProductionEndYear,
        DisplayName = m.DisplayName,
        Programs = m.Programs
            .OrderByDescending(p => p.IsDefault)
            .ThenBy(p => p.Name)
            .Select(p => new VehicleModelProgramSummaryDto
            {
                Id = p.Id,
                Name = p.Name,
                IsDefault = p.IsDefault,
                ItemCount = p.Items.Count
            }).ToList()
    };
}
