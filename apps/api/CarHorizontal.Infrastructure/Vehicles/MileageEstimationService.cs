using System.Collections.Concurrent;
using CarHorizontal.Domain.Entities.Vehicles;
using CarHorizontal.Domain.Vehicles;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Infrastructure.Vehicles;

public class MileageEstimationService : IMileageEstimationService
{
    private const int MinDailyRate = 5;
    private const int MaxDailyRate = 200;
    private const int MaxEstimatedKm = 1_000_000;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);

    private readonly AppDbContext _db;
    private static readonly ConcurrentDictionary<Guid, CacheEntry> Cache = new();

    public MileageEstimationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<MileageEstimate> EstimateAtAsync(Guid vehicleId, DateTime asOf, CancellationToken ct = default)
    {
        if (asOf.Kind == DateTimeKind.Unspecified)
            asOf = DateTime.SpecifyKind(asOf, DateTimeKind.Utc);

        if (Cache.TryGetValue(vehicleId, out var cached)
            && cached.AsOf == asOf
            && DateTime.UtcNow - cached.CachedAt < CacheTtl)
        {
            return cached.Estimate;
        }

        var vehicle = await _db.Vehicles
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == vehicleId && v.DeletedAt == null, ct)
            ?? throw new KeyNotFoundException($"Vehicle {vehicleId} not found.");

        var readings = await _db.Set<VehicleMileageReading>()
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(r => r.VehicleId == vehicleId && r.DeletedAt == null)
            .OrderBy(r => r.ObservedAt)
            .ToListAsync(ct);

        var estimate = Compute(vehicle, readings, asOf);
        Cache[vehicleId] = new CacheEntry(estimate, asOf, DateTime.UtcNow);
        return estimate;
    }

    public void InvalidateCache(Guid vehicleId) => Cache.TryRemove(vehicleId, out _);

    internal static MileageEstimate Compute(Vehicle vehicle, IReadOnlyList<VehicleMileageReading> readings, DateTime asOf)
    {
        DateTime anchorDate;
        int anchorKm;
        double dailyRate;
        MileageConfidence confidence;

        if (readings.Count == 0)
        {
            anchorDate = vehicle.PurchasedAt ?? vehicle.CreatedAt;
            if (anchorDate.Kind == DateTimeKind.Unspecified)
                anchorDate = DateTime.SpecifyKind(anchorDate, DateTimeKind.Utc);
            anchorKm = 0;
            dailyRate = PriorDailyRate(vehicle.EngineType);
            confidence = MileageConfidence.Low;
        }
        else if (readings.Count == 1)
        {
            var only = readings[0];
            anchorDate = EnsureUtc(only.ObservedAt);
            anchorKm = only.Mileage;
            dailyRate = PriorDailyRate(vehicle.EngineType);
            var ageDays = (asOf - anchorDate).TotalDays;
            confidence = ageDays < 30
                ? MileageConfidence.High
                : ageDays < 180
                    ? MileageConfidence.Medium
                    : MileageConfidence.Low;
        }
        else
        {
            var mostRecent = readings[^1];
            anchorDate = EnsureUtc(mostRecent.ObservedAt);
            anchorKm = mostRecent.Mileage;
            dailyRate = WeightedRate(readings, asOf);
            var ageDays = (asOf - anchorDate).TotalDays;
            confidence = ageDays < 30
                ? MileageConfidence.High
                : ageDays < 180
                    ? MileageConfidence.Medium
                    : MileageConfidence.Low;
        }

        var elapsedDays = (asOf - anchorDate).TotalDays;
        if (elapsedDays < 0) elapsedDays = 0;

        var estimated = anchorKm + elapsedDays * dailyRate;

        var floor = readings.Count > 0 ? readings[^1].Mileage : 0;
        if (estimated < floor) estimated = floor;
        if (estimated > MaxEstimatedKm) estimated = MaxEstimatedKm;

        return new MileageEstimate(
            EstimatedKm: (int)Math.Round(estimated),
            Confidence: confidence,
            BasedOnReadings: readings.Count,
            DailyRate: dailyRate,
            AsOf: asOf);
    }

    private static double WeightedRate(IReadOnlyList<VehicleMileageReading> readings, DateTime asOf)
    {
        // Pondération exponentielle : plus c'est récent, plus le poids est élevé.
        // Calcul du daily rate = somme(poids * dKm) / somme(poids * dDays).
        double weightedKmSum = 0;
        double weightedDaysSum = 0;

        for (var i = 1; i < readings.Count; i++)
        {
            var prev = readings[i - 1];
            var curr = readings[i];

            var deltaKm = curr.Mileage - prev.Mileage;
            var deltaDays = (EnsureUtc(curr.ObservedAt) - EnsureUtc(prev.ObservedAt)).TotalDays;
            if (deltaDays <= 0) continue;

            var midpoint = EnsureUtc(prev.ObservedAt).AddDays(deltaDays / 2.0);
            var ageDays = (asOf - midpoint).TotalDays;
            var weight = Math.Exp(-ageDays / 365.0);

            weightedKmSum += weight * deltaKm;
            weightedDaysSum += weight * deltaDays;
        }

        if (weightedDaysSum <= 0)
        {
            // Fallback : prior basé sur le dernier reading
            return PriorDailyRate(EngineType.Gasoline);
        }

        var rate = weightedKmSum / weightedDaysSum;
        if (rate < MinDailyRate) rate = MinDailyRate;
        if (rate > MaxDailyRate) rate = MaxDailyRate;
        return rate;
    }

    private static double PriorDailyRate(EngineType engineType) => engineType switch
    {
        EngineType.Diesel => 47,
        EngineType.Hybrid => 38,
        EngineType.Electric => 36,
        EngineType.LPG => 47,
        _ => 33 // Gasoline / default
    };

    private static DateTime EnsureUtc(DateTime value)
        => value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(value, DateTimeKind.Utc) : value;

    private sealed record CacheEntry(MileageEstimate Estimate, DateTime AsOf, DateTime CachedAt);
}
