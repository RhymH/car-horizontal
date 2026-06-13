using CarHorizontal.Api.Common;
using CarHorizontal.Api.Modules.Leasing.Dtos;
using CarHorizontal.Domain.Entities.Leasing;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Infrastructure.Persistence;
using CarHorizontal.Infrastructure.Timeline;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Leasing;

public class LeasingService : ILeasingService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly ITimelineEngine _timeline;

    public LeasingService(AppDbContext db, ICurrentUserService currentUser, ITimelineEngine timeline)
    {
        _db = db;
        _currentUser = currentUser;
        _timeline = timeline;
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
        var contracts = await query
            .OrderBy(c => c.Status)
            .ThenBy(c => c.EndDate)
            .ToListAsync(ct);

        var items = await MapManyAsync(contracts, ct);
        return new LeasingContractListResponseDto { Items = items, Total = items.Count };
    }

    public async Task<LeasingContractDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var contract = await _db.LeasingContracts.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contrat de leasing {id} introuvable.");

        return (await MapManyAsync(new[] { contract }, ct))[0];
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

        // Règle métier : un véhicule ne peut avoir qu'un contrat actif à la fois.
        await EnsureNoActiveOverlapAsync(
            vehicle.Id, ToUtc(request.StartDate), ToUtc(request.EndDate), excludeId: null, ct);

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

        // Régénère la timeline du véhicule pour faire apparaître aussitôt les
        // échéances leasing (fin de contrat, risque km) — comme MaintenanceService.
        await _timeline.RunForVehicleAsync(entity.VehicleId, ct);
        await ReconcileLeasingEventsAsync(entity.VehicleId, ct);

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

        // Si le contrat reste/redevient actif, il ne doit pas chevaucher un autre actif.
        if (entity.Status == LeasingContractStatus.Active)
            await EnsureNoActiveOverlapAsync(entity.VehicleId, entity.StartDate, entity.EndDate, entity.Id, ct);

        await _db.SaveChangesAsync(ct);
        await _timeline.RunForVehicleAsync(entity.VehicleId, ct);
        await ReconcileLeasingEventsAsync(entity.VehicleId, ct);

        return await GetAsync(entity.Id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.LeasingContracts.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contrat de leasing {id} introuvable.");

        // Soft delete : l'intercepteur convertit le Remove en DeletedAt non nul.
        _db.LeasingContracts.Remove(entity);
        await _db.SaveChangesAsync(ct);

        // Le contrat n'est plus actif → ses échéances timeline ne doivent plus apparaître.
        await ReconcileLeasingEventsAsync(entity.VehicleId, ct);
    }

    // --- Helpers --------------------------------------------------------

    /// <summary>
    /// Mappe des contrats en DTO en chargeant les libellés véhicule/client via des
    /// requêtes groupées (2 au total), sans sous-requête corrélée dans le Select —
    /// ce qui évitait la traduction SQL et provoquait une évaluation client en
    /// pleine itération (erreur Npgsql "command already in progress").
    /// </summary>
    private async Task<List<LeasingContractDto>> MapManyAsync(
        IReadOnlyList<LeasingContract> contracts,
        CancellationToken ct)
    {
        if (contracts.Count == 0) return new List<LeasingContractDto>();

        var vehicleIds = contracts.Select(c => c.VehicleId).Distinct().ToList();
        var customerIds = contracts.Select(c => c.CustomerId).Distinct().ToList();

        var vehicles = (await _db.Vehicles.AsNoTracking()
                .Where(v => vehicleIds.Contains(v.Id))
                .Select(v => new { v.Id, v.Make, v.Model, v.LicensePlate })
                .ToListAsync(ct))
            .ToDictionary(v => v.Id);

        var customerNames = (await _db.Customers.AsNoTracking()
                .Where(c => customerIds.Contains(c.Id))
                .Select(c => new { c.Id, c.FullName })
                .ToListAsync(ct))
            .ToDictionary(c => c.Id, c => c.FullName);

        return contracts.Select(c =>
        {
            vehicles.TryGetValue(c.VehicleId, out var v);
            var label = v is null ? null : $"{v.Make} {v.Model}".Trim();
            return new LeasingContractDto
            {
                Id = c.Id,
                VehicleId = c.VehicleId,
                VehicleLabel = string.IsNullOrWhiteSpace(label) ? null : label,
                LicensePlate = v?.LicensePlate,
                CustomerId = c.CustomerId,
                CustomerFullName = customerNames.GetValueOrDefault(c.CustomerId, string.Empty),
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
        }).ToList();
    }

    /// <summary>
    /// Refuse (409) la présence de deux contrats <see cref="LeasingContractStatus.Active"/>
    /// dont les périodes se chevauchent sur le même véhicule. Chevauchement =
    /// startA ≤ endB ET startB ≤ endA. <paramref name="excludeId"/> exclut le contrat courant (édition).
    /// </summary>
    private async Task EnsureNoActiveOverlapAsync(
        Guid vehicleId, DateTime start, DateTime end, Guid? excludeId, CancellationToken ct)
    {
        var overlaps = await _db.LeasingContracts.AsNoTracking().AnyAsync(c =>
            c.VehicleId == vehicleId
            && c.Status == LeasingContractStatus.Active
            && (excludeId == null || c.Id != excludeId)
            && c.StartDate <= end
            && start <= c.EndDate, ct);

        if (overlaps)
        {
            throw new ConflictException(
                "Un contrat de leasing actif existe déjà sur ce véhicule pour cette période.");
        }
    }

    /// <summary>
    /// Marque <c>Skipped</c> les échéances leasing (LeaseEnd / MileageCapRisk) en
    /// attente du véhicule qui ne correspondent plus à un contrat <b>actif</b>.
    /// Évite les échéances « fantômes » après suppression/clôture/changement de date.
    /// </summary>
    private async Task ReconcileLeasingEventsAsync(Guid vehicleId, CancellationToken ct)
    {
        var activeEndDates = await _db.LeasingContracts
            .Where(c => c.VehicleId == vehicleId && c.Status == LeasingContractStatus.Active)
            .Select(c => c.EndDate)
            .ToListAsync(ct);
        var valid = activeEndDates.ToHashSet();

        var events = await _db.TimelineEvents
            .Where(t => t.VehicleId == vehicleId
                && (t.Kind == TimelineEventKind.LeaseEnd || t.Kind == TimelineEventKind.MileageCapRisk)
                && (t.Status == TimelineEventStatus.Pending || t.Status == TimelineEventStatus.Triggered))
            .ToListAsync(ct);

        var changed = false;
        foreach (var e in events)
        {
            if (e.DueAt is null || !valid.Contains(e.DueAt.Value))
            {
                e.Status = TimelineEventStatus.Skipped;
                changed = true;
            }
        }

        if (changed) await _db.SaveChangesAsync(ct);
    }

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static DateTime ToUtc(DateTime value)
        => value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
