using CarHorizontal.Api.Modules.MileageCheck.Dtos;
using CarHorizontal.Domain.Entities.Messaging;
using CarHorizontal.Domain.Entities.Reminders;
using CarHorizontal.Domain.Entities.Vehicles;
using CarHorizontal.Domain.Vehicles;
using CarHorizontal.Infrastructure.Persistence;
using CarHorizontal.Infrastructure.Timeline;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.MileageCheck;

public class MileageCheckService : IMileageCheckService
{
    public const string LifecycleItemCode = "lifecycle.mileage_check";

    /// <summary>Token validity for the public link.</summary>
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromDays(30);

    /// <summary>Don't ask for a fresh reading more than once per 90 days.</summary>
    private static readonly TimeSpan PerVehicleThrottle = TimeSpan.FromDays(90);

    /// <summary>Skip the request altogether if a reading already arrived in the last 60 days.</summary>
    private static readonly TimeSpan FreshReadingFloor = TimeSpan.FromDays(60);

    /// <summary>Auto job triggers when latest reading is older than this.</summary>
    private static readonly TimeSpan StaleReadingThreshold = TimeSpan.FromDays(180);

    private readonly AppDbContext _db;
    private readonly MileageCheckTokens _tokens;
    private readonly IMileageEstimationService _mileageEstimation;
    private readonly ITimelineEngine _timelineEngine;

    public MileageCheckService(
        AppDbContext db,
        MileageCheckTokens tokens,
        IMileageEstimationService mileageEstimation,
        ITimelineEngine timelineEngine)
    {
        _db = db;
        _tokens = tokens;
        _mileageEstimation = mileageEstimation;
        _timelineEngine = timelineEngine;
    }

    public async Task<RequestMileageResponseDto> RequestForVehicleAsync(Guid vehicleId, CancellationToken ct = default)
    {
        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId, ct)
            ?? throw new KeyNotFoundException($"Vehicle {vehicleId} not found.");

        var now = DateTime.UtcNow;

        // Throttle: no second request within 90 days.
        var alreadyRequested = await _db.Reminders
            .AnyAsync(r => r.VehicleId == vehicleId
                && r.ItemCode == LifecycleItemCode
                && r.CreatedAt >= now - PerVehicleThrottle, ct);
        if (alreadyRequested)
            throw new InvalidOperationException(
                "Une demande de kilométrage a déjà été envoyée à ce client dans les 90 derniers jours.");

        // Skip if a fresh reading exists.
        var freshReading = await _db.VehicleMileageReadings
            .AnyAsync(r => r.VehicleId == vehicleId && r.ObservedAt >= now - FreshReadingFloor, ct);
        if (freshReading)
            throw new InvalidOperationException(
                "Un relevé récent (< 60 jours) est déjà enregistré pour ce véhicule.");

        return await CreateRequestAsync(vehicle, now, ct);
    }

    public async Task<MileageCheckContextDto> ResolveAsync(string token, CancellationToken ct = default)
    {
        var data = ResolveTokenOrThrow(token);
        return await BuildContextAsync(data, ct);
    }

    public async Task<MileageCheckContextDto> SubmitAsync(string token, int mileage, CancellationToken ct = default)
    {
        if (mileage <= 0 || mileage > 1_000_000)
            throw new InvalidOperationException("Le kilométrage saisi est invalide.");

        var data = ResolveTokenOrThrow(token);

        var vehicle = await _db.Vehicles
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(v =>
                v.Id == data.VehicleId
                && v.OrganizationId == data.OrganizationId
                && v.DeletedAt == null, ct)
            ?? throw new KeyNotFoundException("Véhicule introuvable.");

        if (mileage < vehicle.CurrentMileage)
            throw new InvalidOperationException(
                $"Le kilométrage doit être ≥ {vehicle.CurrentMileage} km (dernière valeur enregistrée).");

        var observedAt = DateTime.UtcNow;
        vehicle.CurrentMileage = mileage;
        vehicle.MileageUpdatedAt = observedAt;

        _db.VehicleMileageReadings.Add(new VehicleMileageReading
        {
            OrganizationId = vehicle.OrganizationId,
            VehicleId = vehicle.Id,
            Mileage = mileage,
            ObservedAt = observedAt,
            Source = MileageReadingSource.CustomerSelfReport,
            RecordedAt = observedAt
        });

        await _db.SaveChangesAsync(ct);
        _mileageEstimation.InvalidateCache(vehicle.Id);

        // Re-run the timeline so events anchored on the old estimate refresh.
        await _timelineEngine.RunForVehicleAsync(vehicle.Id, ct);

        return await BuildContextAsync(data, ct);
    }

    public async Task<int> EnsureFreshnessForAllAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var staleCutoff = now - StaleReadingThreshold;
        var requestCutoff = now - PerVehicleThrottle;
        var freshCutoff = now - FreshReadingFloor;

        // Vehicles that have ANY reading and whose most recent one is older than 180 days,
        // OR vehicles with no reading at all (created before backfill / mileage = 0).
        var vehicleLatest = await _db.VehicleMileageReadings
            .IgnoreQueryFilters()
            .Where(r => r.DeletedAt == null)
            .GroupBy(r => r.VehicleId)
            .Select(g => new { VehicleId = g.Key, LastObservedAt = g.Max(x => x.ObservedAt) })
            .ToListAsync(ct);

        var staleVehicleIds = vehicleLatest
            .Where(x => x.LastObservedAt < staleCutoff)
            .Select(x => x.VehicleId)
            .ToHashSet();

        var alreadyRequested = await _db.Reminders
            .IgnoreQueryFilters()
            .Where(r => r.ItemCode == LifecycleItemCode
                && r.DeletedAt == null
                && r.CreatedAt >= requestCutoff)
            .Select(r => r.VehicleId)
            .ToListAsync(ct);
        var alreadyRequestedSet = alreadyRequested
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToHashSet();

        var freshVehicles = await _db.VehicleMileageReadings
            .IgnoreQueryFilters()
            .Where(r => r.DeletedAt == null && r.ObservedAt >= freshCutoff)
            .Select(r => r.VehicleId)
            .Distinct()
            .ToListAsync(ct);
        var freshSet = freshVehicles.ToHashSet();

        var candidateIds = staleVehicleIds
            .Where(id => !alreadyRequestedSet.Contains(id) && !freshSet.Contains(id))
            .ToList();

        if (candidateIds.Count == 0) return 0;

        var vehicles = await _db.Vehicles
            .IgnoreQueryFilters()
            .Where(v => candidateIds.Contains(v.Id) && v.DeletedAt == null)
            .ToListAsync(ct);

        var sent = 0;
        foreach (var vehicle in vehicles)
        {
            await CreateRequestAsync(vehicle, now, ct);
            sent++;
        }

        return sent;
    }

    private async Task<RequestMileageResponseDto> CreateRequestAsync(Vehicle vehicle, DateTime now, CancellationToken ct)
    {
        var expiresAt = now.Add(TokenLifetime);
        var token = _tokens.Issue(vehicle.Id, vehicle.OrganizationId, expiresAt);

        var reminder = new Reminder
        {
            OrganizationId = vehicle.OrganizationId,
            CustomerId = vehicle.CustomerId,
            VehicleId = vehicle.Id,
            Channel = MessageChannel.Email,
            ScheduledAt = now,
            Status = ReminderStatus.Scheduled,
            ItemCode = LifecycleItemCode,
            ResolvedSubject = $"Nous suivons votre {vehicle.Make} {vehicle.Model}".Trim(),
            ResolvedBody = $"Bonjour, pour bien suivre votre véhicule, pourriez-vous nous indiquer votre kilométrage actuel ? Lien valable jusqu'au {expiresAt:dd/MM/yyyy}. Token: {token}"
        };

        _db.Reminders.Add(reminder);
        await _db.SaveChangesAsync(ct);

        return new RequestMileageResponseDto
        {
            ReminderId = reminder.Id,
            Token = token,
            ExpiresAt = expiresAt
        };
    }

    private MileageCheckTokenData ResolveTokenOrThrow(string token)
    {
        if (!_tokens.TryRead(token, out var data))
            throw new InvalidOperationException("Lien invalide ou altéré.");
        if (data.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("Ce lien a expiré. Veuillez contacter votre garage.");
        return data;
    }

    private async Task<MileageCheckContextDto> BuildContextAsync(MileageCheckTokenData data, CancellationToken ct)
    {
        var vehicle = await _db.Vehicles
            .IgnoreQueryFilters()
            .Where(v => v.Id == data.VehicleId
                && v.OrganizationId == data.OrganizationId
                && v.DeletedAt == null)
            .Select(v => new { v.Make, v.Model, v.LicensePlate, v.CurrentMileage, v.MileageUpdatedAt, v.OrganizationId })
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException("Véhicule introuvable.");

        var orgName = await _db.Organizations
            .IgnoreQueryFilters()
            .Where(o => o.Id == vehicle.OrganizationId && o.DeletedAt == null)
            .Select(o => o.Name)
            .FirstOrDefaultAsync(ct) ?? string.Empty;

        return new MileageCheckContextDto
        {
            OrganizationName = orgName,
            VehicleLabel = $"{vehicle.Make} {vehicle.Model}".Trim(),
            LicensePlate = vehicle.LicensePlate,
            LastKnownMileage = vehicle.CurrentMileage,
            LastKnownAt = vehicle.MileageUpdatedAt
        };
    }
}
