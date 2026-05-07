using CarHorizontal.Api.Modules.Maintenance.Dtos;
using CarHorizontal.Domain.Entities.Catalog;
using CarHorizontal.Domain.Entities.Maintenance;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Domain.Entities.Vehicles;
using CarHorizontal.Domain.Vehicles;
using CarHorizontal.Infrastructure.Persistence;
using CarHorizontal.Infrastructure.Timeline;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Maintenance;

public class MaintenanceService : IMaintenanceService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly ITimelineEngine _timelineEngine;
    private readonly IMileageEstimationService _mileageEstimation;

    public MaintenanceService(
        AppDbContext db,
        ICurrentUserService currentUser,
        ITimelineEngine timelineEngine,
        IMileageEstimationService mileageEstimation)
    {
        _db = db;
        _currentUser = currentUser;
        _timelineEngine = timelineEngine;
        _mileageEstimation = mileageEstimation;
    }

    public async Task<MaintenanceListResponseDto> ListByVehicleAsync(
        Guid vehicleId,
        MaintenanceListRequestDto request,
        CancellationToken ct = default)
    {
        var vehicleExists = await _db.Vehicles.AnyAsync(v => v.Id == vehicleId, ct);
        if (!vehicleExists) throw new KeyNotFoundException($"Vehicle {vehicleId} not found.");

        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize switch
        {
            <= 0 => 25,
            > 100 => 100,
            _ => request.PageSize
        };

        var query = _db.MaintenanceRecords.AsNoTracking().Where(m => m.VehicleId == vehicleId);

        var total = await query.CountAsync(ct);

        var sortDir = string.Equals(request.SortDir, "asc", StringComparison.OrdinalIgnoreCase) ? "asc" : "desc";
        query = (request.SortBy?.ToLowerInvariant()) switch
        {
            "mileage" => sortDir == "asc"
                ? query.OrderBy(m => m.MileageAtService)
                : query.OrderByDescending(m => m.MileageAtService),
            "cost" => sortDir == "asc"
                ? query.OrderBy(m => m.Cost)
                : query.OrderByDescending(m => m.Cost),
            "type" => sortDir == "asc"
                ? query.OrderBy(m => m.Type)
                : query.OrderByDescending(m => m.Type),
            _ => sortDir == "asc"
                ? query.OrderBy(m => m.PerformedAt)
                : query.OrderByDescending(m => m.PerformedAt)
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => MapToDto(m))
            .ToListAsync(ct);

        return new MaintenanceListResponseDto
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Items = items
        };
    }

    public async Task<MaintenanceRecordDto> CreateAsync(
        Guid vehicleId,
        CreateMaintenanceRequestDto request,
        CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");

        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId, ct)
            ?? throw new KeyNotFoundException($"Vehicle {vehicleId} not found.");

        var type = Enum.Parse<MaintenanceType>(request.Type, ignoreCase: true);
        var record = new MaintenanceRecord
        {
            OrganizationId = orgId,
            VehicleId = vehicle.Id,
            PerformedAt = DateTime.SpecifyKind(request.PerformedAt, DateTimeKind.Utc),
            Type = type,
            Description = (request.Description ?? string.Empty).Trim(),
            MileageAtService = request.MileageAtService,
            Cost = request.Cost,
            MechanicName = NormalizeOptional(request.MechanicName),
            NextDueAt = request.NextDueAt.HasValue
                ? DateTime.SpecifyKind(request.NextDueAt.Value, DateTimeKind.Utc)
                : null,
            NextDueMileage = request.NextDueMileage,
            ItemCodes = ResolveItemCodes(request.ItemCodes, type)
        };

        _db.MaintenanceRecords.Add(record);

        if (record.MileageAtService > 0)
        {
            _db.VehicleMileageReadings.Add(new VehicleMileageReading
            {
                OrganizationId = orgId,
                VehicleId = vehicle.Id,
                Mileage = record.MileageAtService,
                ObservedAt = record.PerformedAt,
                Source = MileageReadingSource.MaintenanceRecord,
                RecordedAt = DateTime.UtcNow,
                RecordedBy = _currentUser.UserId
            });
        }

        await _db.SaveChangesAsync(ct);
        _mileageEstimation.InvalidateCache(vehicle.Id);

        await SyncTimelineEventAsync(orgId, vehicle.CustomerId, record, ct);
        await _timelineEngine.RunForVehicleAsync(vehicle.Id, ct);

        return MapToDto(record);
    }

    public async Task<MaintenanceRecordDto> UpdateAsync(
        Guid id,
        UpdateMaintenanceRequestDto request,
        CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");

        var record = await _db.MaintenanceRecords.FirstOrDefaultAsync(m => m.Id == id, ct)
            ?? throw new KeyNotFoundException($"Maintenance record {id} not found.");

        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == record.VehicleId, ct)
            ?? throw new KeyNotFoundException($"Vehicle {record.VehicleId} not found.");

        if (request.PerformedAt.HasValue)
            record.PerformedAt = DateTime.SpecifyKind(request.PerformedAt.Value, DateTimeKind.Utc);
        if (request.Type is not null)
            record.Type = Enum.Parse<MaintenanceType>(request.Type, ignoreCase: true);
        if (request.Description is not null)
            record.Description = request.Description.Trim();
        if (request.MileageAtService.HasValue)
            record.MileageAtService = request.MileageAtService.Value;
        if (request.Cost.HasValue)
            record.Cost = request.Cost.Value;
        if (request.MechanicName is not null)
            record.MechanicName = NormalizeOptional(request.MechanicName);

        if (request.ClearNextDueAt) record.NextDueAt = null;
        else if (request.NextDueAt.HasValue)
            record.NextDueAt = DateTime.SpecifyKind(request.NextDueAt.Value, DateTimeKind.Utc);

        if (request.ClearNextDueMileage) record.NextDueMileage = null;
        else if (request.NextDueMileage.HasValue)
            record.NextDueMileage = request.NextDueMileage.Value;

        if (request.ItemCodes is not null)
        {
            record.ItemCodes = ResolveItemCodes(request.ItemCodes, record.Type);
        }

        await _db.SaveChangesAsync(ct);

        await SyncTimelineEventAsync(orgId, vehicle.CustomerId, record, ct);
        await _timelineEngine.RunForVehicleAsync(vehicle.Id, ct);

        return MapToDto(record);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var record = await _db.MaintenanceRecords.FirstOrDefaultAsync(m => m.Id == id, ct)
            ?? throw new KeyNotFoundException($"Maintenance record {id} not found.");

        var ruleTag = BuildRuleTag(record.Id);
        var linkedEvents = await _db.TimelineEvents
            .Where(e => e.GeneratedFromRule == ruleTag)
            .ToListAsync(ct);
        if (linkedEvents.Count > 0) _db.TimelineEvents.RemoveRange(linkedEvents);

        _db.MaintenanceRecords.Remove(record);
        await _db.SaveChangesAsync(ct);
    }

    private async Task SyncTimelineEventAsync(
        Guid orgId,
        Guid customerId,
        MaintenanceRecord record,
        CancellationToken ct)
    {
        var ruleTag = BuildRuleTag(record.Id);

        var existing = await _db.TimelineEvents
            .FirstOrDefaultAsync(e => e.GeneratedFromRule == ruleTag, ct);

        var hasNextDue = record.NextDueAt.HasValue || record.NextDueMileage.HasValue;

        if (!hasNextDue)
        {
            if (existing is not null) _db.TimelineEvents.Remove(existing);
            await _db.SaveChangesAsync(ct);
            return;
        }

        var title = BuildEventTitle(record);
        var description = string.IsNullOrWhiteSpace(record.Description)
            ? $"Prochaine échéance suite à l'entretien du {record.PerformedAt:dd/MM/yyyy}."
            : record.Description;

        if (existing is null)
        {
            _db.TimelineEvents.Add(new TimelineEvent
            {
                OrganizationId = orgId,
                VehicleId = record.VehicleId,
                CustomerId = customerId,
                Kind = TimelineEventKind.Maintenance,
                Title = title,
                Description = description,
                DueAt = record.NextDueAt,
                DueMileage = record.NextDueMileage,
                Status = TimelineEventStatus.Pending,
                Source = TimelineEventSource.AutoGenerated,
                GeneratedFromRule = ruleTag
            });
        }
        else
        {
            existing.Title = title;
            existing.Description = description;
            existing.DueAt = record.NextDueAt;
            existing.DueMileage = record.NextDueMileage;
            if (existing.Status == TimelineEventStatus.Done || existing.Status == TimelineEventStatus.Skipped)
            {
                existing.Status = TimelineEventStatus.Pending;
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    private static string BuildRuleTag(Guid maintenanceId) => $"MaintenanceRecord:{maintenanceId:N}";

    private static string BuildEventTitle(MaintenanceRecord record) => record.Type switch
    {
        MaintenanceType.Oil => "Prochaine vidange",
        MaintenanceType.Tires => "Prochain entretien pneus",
        MaintenanceType.Brakes => "Prochain entretien freins",
        MaintenanceType.FullService => "Prochaine révision complète",
        MaintenanceType.TechnicalInspection => "Prochain contrôle technique",
        _ => "Prochain entretien"
    };

    private static MaintenanceRecordDto MapToDto(MaintenanceRecord m) => new()
    {
        Id = m.Id,
        VehicleId = m.VehicleId,
        PerformedAt = m.PerformedAt,
        Type = m.Type.ToString(),
        Description = m.Description,
        MileageAtService = m.MileageAtService,
        Cost = m.Cost,
        MechanicName = m.MechanicName,
        NextDueAt = m.NextDueAt,
        NextDueMileage = m.NextDueMileage,
        CreatedAt = m.CreatedAt,
        UpdatedAt = m.UpdatedAt,
        ItemCodes = m.ItemCodes
    };

    private static string[] ResolveItemCodes(string[]? supplied, MaintenanceType type)
    {
        if (supplied is { Length: > 0 })
        {
            return supplied
                .Select(c => c.Trim())
                .Where(c => MaintenanceItemCode.IsKnown(c))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }

        return type switch
        {
            MaintenanceType.Oil => new[] { MaintenanceItemCode.OilChange },
            MaintenanceType.Tires => new[] { MaintenanceItemCode.TireReplacement },
            MaintenanceType.Brakes => new[]
            {
                MaintenanceItemCode.BrakePadsFront,
                MaintenanceItemCode.BrakeDiscsFront
            },
            MaintenanceType.FullService => new[]
            {
                MaintenanceItemCode.OilChange,
                MaintenanceItemCode.CabinFilter,
                MaintenanceItemCode.AirFilter,
                MaintenanceItemCode.BrakeFluid
            },
            MaintenanceType.TechnicalInspection => new[] { MaintenanceItemCode.TechnicalInspection },
            _ => Array.Empty<string>()
        };
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }
}
