using CarHorizontal.Domain.Entities.Maintenance;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Domain.Entities.Vehicles;
using CarHorizontal.Domain.Timeline.Rules;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Infrastructure.Timeline;

public class TimelineEngine : ITimelineEngine
{
    private static readonly TimeSpan DueAtTolerance = TimeSpan.FromDays(7);

    private readonly AppDbContext _db;
    private readonly IReadOnlyList<IRule> _rules;
    private readonly TimeProvider _clock;

    public TimelineEngine(AppDbContext db, IEnumerable<IRule> rules, TimeProvider? clock = null)
    {
        _db = db;
        _rules = rules.ToList();
        _clock = clock ?? TimeProvider.System;
    }

    public async Task<int> RunForVehicleAsync(Guid vehicleId, CancellationToken ct = default)
    {
        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId, ct);
        if (vehicle is null) return 0;

        var enabledCodes = await GetEnabledRuleCodesAsync(vehicle.OrganizationId, ct);
        var maintenance = await _db.MaintenanceRecords
            .Where(m => m.VehicleId == vehicleId)
            .ToListAsync(ct);
        var existing = await _db.TimelineEvents
            .Where(e => e.VehicleId == vehicleId)
            .ToListAsync(ct);

        var inserted = ProcessVehicle(vehicle, maintenance, existing, enabledCodes);
        if (inserted > 0) await _db.SaveChangesAsync(ct);
        return inserted;
    }

    public async Task<int> RunForOrganizationAsync(Guid organizationId, CancellationToken ct = default)
    {
        var enabledCodes = await GetEnabledRuleCodesAsync(organizationId, ct);

        var vehicles = await _db.Vehicles
            .IgnoreQueryFilters()
            .Where(v => v.OrganizationId == organizationId && v.DeletedAt == null)
            .ToListAsync(ct);

        if (vehicles.Count == 0) return 0;

        var vehicleIds = vehicles.Select(v => v.Id).ToHashSet();

        var maintenance = await _db.MaintenanceRecords
            .IgnoreQueryFilters()
            .Where(m => m.OrganizationId == organizationId && m.DeletedAt == null && vehicleIds.Contains(m.VehicleId))
            .ToListAsync(ct);

        var existing = await _db.TimelineEvents
            .IgnoreQueryFilters()
            .Where(e => e.OrganizationId == organizationId && e.DeletedAt == null && vehicleIds.Contains(e.VehicleId))
            .ToListAsync(ct);

        var maintenanceByVehicle = maintenance
            .GroupBy(m => m.VehicleId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<MaintenanceRecord>)g.ToList());
        var existingByVehicle = existing
            .GroupBy(e => e.VehicleId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<TimelineEvent>)g.ToList());

        var totalInserted = 0;
        foreach (var vehicle in vehicles)
        {
            var v = maintenanceByVehicle.TryGetValue(vehicle.Id, out var mList) ? mList : Array.Empty<MaintenanceRecord>();
            var e = existingByVehicle.TryGetValue(vehicle.Id, out var eList) ? eList : Array.Empty<TimelineEvent>();
            totalInserted += ProcessVehicle(vehicle, v, e, enabledCodes);
        }

        if (totalInserted > 0) await _db.SaveChangesAsync(ct);
        return totalInserted;
    }

    private int ProcessVehicle(
        Vehicle vehicle,
        IReadOnlyList<MaintenanceRecord> maintenance,
        IReadOnlyList<TimelineEvent> existingEvents,
        ISet<string> enabledRuleCodes)
    {
        var now = _clock.GetUtcNow().UtcDateTime;
        var context = new RuleContext(vehicle, maintenance, now);

        var inserted = 0;
        foreach (var rule in _rules)
        {
            if (enabledRuleCodes.Count > 0 && !enabledRuleCodes.Contains(rule.Code)) continue;
            if (!rule.Applies(context)) continue;

            foreach (var generated in rule.Generate(context))
            {
                if (IsDuplicate(generated, existingEvents)) continue;
                _db.TimelineEvents.Add(generated);
                existingEvents = existingEvents.Append(generated).ToList();
                inserted++;
            }
        }

        return inserted;
    }

    private static bool IsDuplicate(TimelineEvent candidate, IReadOnlyList<TimelineEvent> existing)
    {
        foreach (var e in existing)
        {
            if (e.VehicleId != candidate.VehicleId) continue;
            if (e.Kind != candidate.Kind) continue;
            if (e.Status == TimelineEventStatus.Done || e.Status == TimelineEventStatus.Skipped) continue;

            if (candidate.DueAt.HasValue && e.DueAt.HasValue)
            {
                var diff = (candidate.DueAt.Value - e.DueAt.Value).Duration();
                if (diff <= DueAtTolerance) return true;
            }
            else if (candidate.DueMileage.HasValue && e.DueMileage.HasValue)
            {
                if (candidate.DueMileage.Value == e.DueMileage.Value) return true;
            }
            else if (!candidate.DueAt.HasValue && !e.DueAt.HasValue
                && !candidate.DueMileage.HasValue && !e.DueMileage.HasValue)
            {
                if (string.Equals(e.GeneratedFromRule, candidate.GeneratedFromRule, StringComparison.Ordinal))
                    return true;
            }
        }
        return false;
    }

    private async Task<HashSet<string>> GetEnabledRuleCodesAsync(Guid orgId, CancellationToken ct)
    {
        var rows = await _db.OrganizationTimelineRules
            .IgnoreQueryFilters()
            .Where(r => r.OrganizationId == orgId && r.DeletedAt == null)
            .Select(r => new { r.RuleCode, r.Enabled })
            .ToListAsync(ct);

        if (rows.Count == 0)
        {
            return _rules.Select(r => r.Code).ToHashSet(StringComparer.Ordinal);
        }

        var disabled = rows.Where(r => !r.Enabled).Select(r => r.RuleCode).ToHashSet(StringComparer.Ordinal);
        return _rules
            .Select(r => r.Code)
            .Where(code => !disabled.Contains(code))
            .ToHashSet(StringComparer.Ordinal);
    }
}
