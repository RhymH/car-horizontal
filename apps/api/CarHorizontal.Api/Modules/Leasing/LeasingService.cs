using CarHorizontal.Api.Modules.Leasing.Dtos;
using CarHorizontal.Domain.Entities.Leasing;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Leasing;

public class LeasingService : ILeasingService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public LeasingService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<LeasingContractListResponseDto> ListAsync(
        LeasingContractListRequestDto request,
        CancellationToken ct = default)
    {
        var query = _db.LeasingContracts.AsNoTracking().AsQueryable();

        if (request.VehicleId.HasValue) query = query.Where(c => c.VehicleId == request.VehicleId.Value);
        if (request.CustomerId.HasValue) query = query.Where(c => c.CustomerId == request.CustomerId.Value);
        if (!string.IsNullOrWhiteSpace(request.Status)
            && Enum.TryParse<LeasingContractStatus>(request.Status, ignoreCase: true, out var status))
        {
            query = query.Where(c => c.Status == status);
        }

        // Tri : contrats actifs d'abord, par échéance la plus proche.
        var rows = await query
            .OrderBy(c => c.Status)
            .ThenBy(c => c.EndDate)
            .Select(c => Project(c, _db))
            .ToListAsync(ct);

        var items = rows.Select(ToDto).ToList();
        return new LeasingContractListResponseDto { Items = items, Total = items.Count };
    }

    public async Task<LeasingContractDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var row = await _db.LeasingContracts.AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => Project(c, _db))
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException($"Contrat de leasing {id} introuvable.");
        return ToDto(row);
    }

    public async Task<LeasingContractDto> CreateAsync(
        CreateLeasingContractRequestDto request,
        CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Organisation active requise.");

        // Le véhicule (et donc son client) doit appartenir à l'org courante.
        var vehicle = await _db.Vehicles
            .Where(v => v.Id == request.VehicleId)
            .Select(v => new { v.Id, v.CustomerId })
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException("Véhicule introuvable.");

        var entity = new LeasingContract
        {
            OrganizationId = orgId,
            VehicleId = vehicle.Id,
            CustomerId = vehicle.CustomerId,
            Lessor = request.Lessor.Trim(),
            Reference = NormalizeOptional(request.Reference),
            MonthlyPayment = request.MonthlyPayment,
            StartDate = ToUtc(request.StartDate),
            EndDate = ToUtc(request.EndDate),
            MileageCapKm = request.MileageCapKm,
            BuyoutValue = request.BuyoutValue,
            Status = LeasingContractStatus.Active,
            Notes = NormalizeOptional(request.Notes)
        };

        _db.LeasingContracts.Add(entity);
        await _db.SaveChangesAsync(ct);
        return await GetAsync(entity.Id, ct);
    }

    public async Task<LeasingContractDto> UpdateAsync(
        Guid id,
        UpdateLeasingContractRequestDto request,
        CancellationToken ct = default)
    {
        var entity = await _db.LeasingContracts.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contrat de leasing {id} introuvable.");

        if (request.Lessor is not null) entity.Lessor = request.Lessor.Trim();
        if (request.Reference is not null) entity.Reference = NormalizeOptional(request.Reference);
        if (request.Notes is not null) entity.Notes = NormalizeOptional(request.Notes);
        if (request.MonthlyPayment.HasValue) entity.MonthlyPayment = request.MonthlyPayment;
        if (request.BuyoutValue.HasValue) entity.BuyoutValue = request.BuyoutValue;
        if (request.MileageCapKm.HasValue) entity.MileageCapKm = request.MileageCapKm;
        if (request.StartDate.HasValue) entity.StartDate = ToUtc(request.StartDate.Value);
        if (request.EndDate.HasValue) entity.EndDate = ToUtc(request.EndDate.Value);
        if (!string.IsNullOrWhiteSpace(request.Status))
            entity.Status = Enum.Parse<LeasingContractStatus>(request.Status, ignoreCase: true);

        await _db.SaveChangesAsync(ct);
        return await GetAsync(entity.Id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.LeasingContracts.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contrat de leasing {id} introuvable.");

        // Soft delete : l'intercepteur convertit le Remove en DeletedAt non nul.
        _db.LeasingContracts.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    // --- Helpers --------------------------------------------------------

    /// <summary>Projection EF (entité + libellés véhicule/client) translatable en SQL.</summary>
    private static ContractRow Project(LeasingContract c, AppDbContext db) => new()
    {
        Contract = c,
        CustomerFullName = db.Customers.Where(x => x.Id == c.CustomerId).Select(x => x.FullName).FirstOrDefault() ?? string.Empty,
        Make = db.Vehicles.Where(v => v.Id == c.VehicleId).Select(v => v.Make).FirstOrDefault(),
        Model = db.Vehicles.Where(v => v.Id == c.VehicleId).Select(v => v.Model).FirstOrDefault(),
        LicensePlate = db.Vehicles.Where(v => v.Id == c.VehicleId).Select(v => v.LicensePlate).FirstOrDefault()
    };

    private static LeasingContractDto ToDto(ContractRow r)
    {
        var c = r.Contract;
        var label = $"{r.Make} {r.Model}".Trim();
        return new LeasingContractDto
        {
            Id = c.Id,
            VehicleId = c.VehicleId,
            VehicleLabel = string.IsNullOrWhiteSpace(label) ? null : label,
            LicensePlate = r.LicensePlate,
            CustomerId = c.CustomerId,
            CustomerFullName = r.CustomerFullName,
            Lessor = c.Lessor,
            Reference = c.Reference,
            MonthlyPayment = c.MonthlyPayment,
            StartDate = c.StartDate,
            EndDate = c.EndDate,
            MileageCapKm = c.MileageCapKm,
            BuyoutValue = c.BuyoutValue,
            Status = c.Status.ToString(),
            Notes = c.Notes,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt
        };
    }

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static DateTime ToUtc(DateTime value)
        => value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);

    /// <summary>Ligne intermédiaire de projection (entité + libellés).</summary>
    private sealed class ContractRow
    {
        public required LeasingContract Contract { get; init; }
        public string CustomerFullName { get; init; } = string.Empty;
        public string? Make { get; init; }
        public string? Model { get; init; }
        public string? LicensePlate { get; init; }
    }
}
