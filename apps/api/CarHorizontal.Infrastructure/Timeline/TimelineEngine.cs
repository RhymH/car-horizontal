using CarHorizontal.Domain.Entities.Catalog;
using CarHorizontal.Domain.Entities.Leasing;
using CarHorizontal.Domain.Entities.Maintenance;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Domain.Entities.Vehicles;
using CarHorizontal.Domain.Timeline.Rules;
using CarHorizontal.Domain.Vehicles;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Infrastructure.Timeline;

public class TimelineEngine : ITimelineEngine
{
    private static readonly TimeSpan DueAtTolerance = TimeSpan.FromDays(7);
    private static readonly TimeSpan EstimatedDueShift = TimeSpan.FromDays(30);

    private readonly AppDbContext _db;
    private readonly IReadOnlyList<IRule> _rules;
    private readonly TimeProvider _clock;
    private readonly IMileageEstimationService? _mileageEstimation;

    public TimelineEngine(
        AppDbContext db,
        IEnumerable<IRule> rules,
        TimeProvider? clock = null,
        IMileageEstimationService? mileageEstimation = null)
    {
        _db = db;
        _rules = rules.ToList();
        _clock = clock ?? TimeProvider.System;
        _mileageEstimation = mileageEstimation;
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

        var (model, program) = await LoadProgramAsync(vehicle, ct);
        var overrides = await LoadOverridesAsync(vehicle, ct);
        var leasing = await _db.LeasingContracts
            .Where(c => c.VehicleId == vehicleId)
            .ToListAsync(ct);
        var now = _clock.GetUtcNow().UtcDateTime;
        var estimate = await SafeEstimateAsync(vehicle.Id, now, ct);

        var inserted = ProcessVehicle(
            vehicle, maintenance, existing, enabledCodes, model, program, overrides, estimate, leasing, now);
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

        var modelIds = vehicles.Where(v => v.VehicleModelId.HasValue).Select(v => v.VehicleModelId!.Value).Distinct().ToList();
        var programIds = vehicles.Where(v => v.SelectedProgramId.HasValue).Select(v => v.SelectedProgramId!.Value).Distinct().ToList();

        var modelsById = modelIds.Count == 0
            ? new Dictionary<Guid, VehicleModel>()
            : await _db.VehicleModels
                .IgnoreQueryFilters()
                .Where(m => modelIds.Contains(m.Id) && m.DeletedAt == null)
                .ToDictionaryAsync(m => m.Id, ct);

        var programs = programIds.Count == 0
            ? new List<MaintenanceProgram>()
            : await _db.MaintenancePrograms
                .IgnoreQueryFilters()
                .Where(p => programIds.Contains(p.Id) && p.DeletedAt == null)
                .Include(p => p.Items)
                .ToListAsync(ct);

        var programsByVehicleModel = await ResolveDefaultProgramsAsync(modelIds, programs, ct);
        var programsById = programs.ToDictionary(p => p.Id);

        var overridesByVehicle = await _db.VehicleProgramOverrides
            .IgnoreQueryFilters()
            .Where(o => o.OrganizationId == organizationId && o.DeletedAt == null && vehicleIds.Contains(o.VehicleId))
            .ToListAsync(ct);
        var overridesGrouped = overridesByVehicle
            .GroupBy(o => o.VehicleId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<VehicleProgramOverride>)g.ToList());

        var leasingByVehicle = (await _db.LeasingContracts
                .IgnoreQueryFilters()
                .Where(c => c.OrganizationId == organizationId && c.DeletedAt == null && vehicleIds.Contains(c.VehicleId))
                .ToListAsync(ct))
            .GroupBy(c => c.VehicleId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<LeasingContract>)g.ToList());

        var totalInserted = 0;
        var now = _clock.GetUtcNow().UtcDateTime;
        foreach (var vehicle in vehicles)
        {
            var v = maintenanceByVehicle.TryGetValue(vehicle.Id, out var mList) ? mList : Array.Empty<MaintenanceRecord>();
            var e = existingByVehicle.TryGetValue(vehicle.Id, out var eList) ? eList : Array.Empty<TimelineEvent>();

            VehicleModel? model = null;
            if (vehicle.VehicleModelId.HasValue) modelsById.TryGetValue(vehicle.VehicleModelId.Value, out model);

            MaintenanceProgram? program = null;
            if (vehicle.SelectedProgramId.HasValue)
            {
                programsById.TryGetValue(vehicle.SelectedProgramId.Value, out program);
            }
            else if (vehicle.VehicleModelId.HasValue)
            {
                programsByVehicleModel.TryGetValue(vehicle.VehicleModelId.Value, out program);
            }

            var ovs = overridesGrouped.TryGetValue(vehicle.Id, out var ovList)
                ? ovList
                : Array.Empty<VehicleProgramOverride>();

            var leasing = leasingByVehicle.TryGetValue(vehicle.Id, out var leaseList)
                ? leaseList
                : Array.Empty<LeasingContract>();

            var estimate = await SafeEstimateAsync(vehicle.Id, now, ct);
            totalInserted += ProcessVehicle(
                vehicle, v, e, enabledCodes, model, program, ovs, estimate, leasing, now);
        }

        if (totalInserted > 0) await _db.SaveChangesAsync(ct);
        return totalInserted;
    }

    private async Task<MileageEstimate?> SafeEstimateAsync(Guid vehicleId, DateTime now, CancellationToken ct)
    {
        if (_mileageEstimation is null) return null;
        try
        {
            return await _mileageEstimation.EstimateAtAsync(vehicleId, now, ct);
        }
        catch
        {
            return null;
        }
    }

    private async Task<(VehicleModel? Model, MaintenanceProgram? Program)> LoadProgramAsync(
        Vehicle vehicle, CancellationToken ct)
    {
        if (!vehicle.VehicleModelId.HasValue) return (null, null);

        var model = await _db.VehicleModels
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.Id == vehicle.VehicleModelId.Value && m.DeletedAt == null, ct);
        if (model is null) return (null, null);

        MaintenanceProgram? program;
        if (vehicle.SelectedProgramId.HasValue)
        {
            program = await _db.MaintenancePrograms
                .IgnoreQueryFilters()
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == vehicle.SelectedProgramId.Value && p.DeletedAt == null, ct);
        }
        else
        {
            program = await _db.MaintenancePrograms
                .IgnoreQueryFilters()
                .Include(p => p.Items)
                .Where(p => p.VehicleModelId == vehicle.VehicleModelId.Value && p.DeletedAt == null)
                .OrderByDescending(p => p.IsDefault)
                .ThenBy(p => p.Name)
                .FirstOrDefaultAsync(ct);
        }

        return (model, program);
    }

    private async Task<IReadOnlyList<VehicleProgramOverride>> LoadOverridesAsync(Vehicle vehicle, CancellationToken ct)
    {
        return await _db.VehicleProgramOverrides
            .IgnoreQueryFilters()
            .Where(o => o.VehicleId == vehicle.Id && o.DeletedAt == null)
            .ToListAsync(ct);
    }

    private async Task<Dictionary<Guid, MaintenanceProgram>> ResolveDefaultProgramsAsync(
        IReadOnlyList<Guid> modelIds, IReadOnlyList<MaintenanceProgram> alreadyLoaded, CancellationToken ct)
    {
        if (modelIds.Count == 0) return new();

        var loadedModelIds = alreadyLoaded.Select(p => p.VehicleModelId).ToHashSet();
        var missingModelIds = modelIds.Where(id => !loadedModelIds.Contains(id)).ToList();

        var defaults = missingModelIds.Count == 0
            ? new List<MaintenanceProgram>()
            : await _db.MaintenancePrograms
                .IgnoreQueryFilters()
                .Where(p => missingModelIds.Contains(p.VehicleModelId) && p.DeletedAt == null)
                .Include(p => p.Items)
                .ToListAsync(ct);

        return alreadyLoaded.Concat(defaults)
            .GroupBy(p => p.VehicleModelId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(p => p.IsDefault).ThenBy(p => p.Name).First());
    }

    private int ProcessVehicle(
        Vehicle vehicle,
        IReadOnlyList<MaintenanceRecord> maintenance,
        IReadOnlyList<TimelineEvent> existingEvents,
        ISet<string> enabledRuleCodes,
        VehicleModel? model,
        MaintenanceProgram? program,
        IReadOnlyList<VehicleProgramOverride> overrides,
        MileageEstimate? estimate,
        IReadOnlyList<LeasingContract> leasing,
        DateTime now)
    {
        var context = new RuleContext(vehicle, maintenance, now, model, program, overrides, estimate, leasing);

        var inserted = 0;
        foreach (var rule in _rules)
        {
            if (enabledRuleCodes.Count > 0 && !enabledRuleCodes.Contains(rule.Code)) continue;
            if (!rule.Applies(context)) continue;

            foreach (var generated in rule.Generate(context))
            {
                var existing = FindMatchingActive(generated, existingEvents);
                if (existing is not null)
                {
                    UpdateExistingFromCandidate(existing, generated);
                    continue;
                }
                _db.TimelineEvents.Add(generated);
                existingEvents = existingEvents.Append(generated).ToList();
                inserted++;
            }
        }

        return inserted;
    }

    private static TimelineEvent? FindMatchingActive(TimelineEvent candidate, IReadOnlyList<TimelineEvent> existing)
    {
        foreach (var e in existing)
        {
            if (e.VehicleId != candidate.VehicleId) continue;
            if (e.Kind != candidate.Kind) continue;
            if (e.Status == TimelineEventStatus.Done || e.Status == TimelineEventStatus.Skipped) continue;

            // Strongest signal: same item code on same vehicle (Program rules).
            if (!string.IsNullOrEmpty(candidate.ItemCode)
                && string.Equals(e.ItemCode, candidate.ItemCode, StringComparison.Ordinal))
                return e;

            if (candidate.DueAt.HasValue && e.DueAt.HasValue)
            {
                var diff = (candidate.DueAt.Value - e.DueAt.Value).Duration();
                if (diff <= DueAtTolerance) return e;
            }
            else if (candidate.DueMileage.HasValue && e.DueMileage.HasValue)
            {
                if (candidate.DueMileage.Value == e.DueMileage.Value) return e;
            }
            else if (!candidate.DueAt.HasValue && !e.DueAt.HasValue
                && !candidate.DueMileage.HasValue && !e.DueMileage.HasValue)
            {
                if (string.Equals(e.GeneratedFromRule, candidate.GeneratedFromRule, StringComparison.Ordinal))
                    return e;
            }
        }
        return null;
    }

    /// <summary>
    /// Refresh an existing pending event from a freshly generated candidate
    /// when the mileage estimate has shifted significantly. Keeps the event
    /// id stable so reminders/links remain valid.
    /// </summary>
    private static void UpdateExistingFromCandidate(TimelineEvent existing, TimelineEvent candidate)
    {
        var shouldUpdate = false;

        if (candidate.EstimatedDueAt.HasValue && existing.EstimatedDueAt.HasValue)
        {
            var shift = (candidate.EstimatedDueAt.Value - existing.EstimatedDueAt.Value).Duration();
            if (shift > EstimatedDueShift) shouldUpdate = true;
        }
        else if (candidate.EstimatedDueAt.HasValue != existing.EstimatedDueAt.HasValue)
        {
            shouldUpdate = true;
        }

        if (!shouldUpdate) return;

        existing.Description = candidate.Description;
        existing.DueAt = candidate.DueAt;
        existing.DueMileage = candidate.DueMileage;
        existing.EstimatedDueAt = candidate.EstimatedDueAt;
        existing.EstimatedKmRemaining = candidate.EstimatedKmRemaining;
        existing.MileageConfidenceAtGeneration = candidate.MileageConfidenceAtGeneration;
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
