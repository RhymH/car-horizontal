using CarHorizontal.Domain.Entities.Catalog;
using CarHorizontal.Domain.Entities.Maintenance;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Domain.Entities.Vehicles;
using CarHorizontal.Domain.Vehicles;

namespace CarHorizontal.Domain.Timeline.Rules;

/// <summary>
/// Projects a manufacturer maintenance program onto a vehicle's maintenance
/// history to generate concrete, contextual timeline events
/// (e.g. "Filtre carburant à 60 000 km — dans 1 200 km").
/// </summary>
public sealed class ProgramExecutorRule : IRule
{
    public const string RuleCode = "ProgramExecutor";
    private const int FallbackDailyKm = 40;

    public string Code => RuleCode;

    public bool Applies(RuleContext context) =>
        context.Vehicle.VehicleModelId.HasValue
        && context.Program is not null
        && context.Program.Items.Count > 0;

    public IEnumerable<TimelineEvent> Generate(RuleContext context)
    {
        var program = context.Program!;
        var vehicle = context.Vehicle;
        var modelDisplayName = context.VehicleModel?.DisplayName
            ?? $"{vehicle.Make} {vehicle.Model}".Trim();

        var historyByCode = context.MaintenanceRecords
            .Where(r => r.ItemCodes.Length > 0)
            .SelectMany(r => r.ItemCodes.Select(code => (code, record: r)))
            .GroupBy(x => x.code, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(x => x.record.PerformedAt)
                      .Select(x => x.record)
                      .ToList(),
                StringComparer.OrdinalIgnoreCase);

        var overrides = context.Overrides ?? Array.Empty<VehicleProgramOverride>();
        var overrideByCode = overrides.ToDictionary(
            o => o.ItemCode, StringComparer.OrdinalIgnoreCase);

        // Pre-resolved estimate if engine supplied one; else fall back to the
        // raw odometer + a constant daily-km projection (legacy behaviour).
        var estimate = context.CurrentMileageEstimate;
        var currentKm = estimate?.EstimatedKm ?? vehicle.CurrentMileage;
        var dailyKm = estimate is not null && estimate.DailyRate > 0
            ? estimate.DailyRate
            : FallbackDailyKm;
        var confidence = estimate?.Confidence;

        foreach (var item in program.Items)
        {
            if (overrideByCode.TryGetValue(item.Code, out var ov) && ov.Disabled)
                continue;

            var intervalMonths = ov?.OverrideIntervalMonths ?? item.IntervalMonths;
            var intervalKm = ov?.OverrideIntervalKm ?? item.IntervalKm;
            if (intervalMonths is null && intervalKm is null) continue;

            historyByCode.TryGetValue(item.Code, out var history);
            var lastDone = history?.FirstOrDefault();

            DateTime? nextDueAt = null;
            int? nextDueKm = null;

            if (lastDone is null)
            {
                var anchorDate = vehicle.PurchasedAt ?? vehicle.CreatedAt;
                var firstMonths = item.FirstOccurrenceMonths ?? intervalMonths;
                var firstKm = item.FirstOccurrenceKm ?? intervalKm;
                if (firstMonths is not null)
                    nextDueAt = DateTime.SpecifyKind(anchorDate.AddMonths(firstMonths.Value), DateTimeKind.Utc);
                if (firstKm is not null)
                    nextDueKm = firstKm.Value;
            }
            else
            {
                if (intervalMonths is not null)
                    nextDueAt = DateTime.SpecifyKind(lastDone.PerformedAt.AddMonths(intervalMonths.Value), DateTimeKind.Utc);
                if (intervalKm is not null)
                    nextDueKm = lastDone.MileageAtService + intervalKm.Value;
            }

            if (item.Trigger == MaintenanceItemTrigger.TimeOnly) nextDueKm = null;
            if (item.Trigger == MaintenanceItemTrigger.KmOnly) nextDueAt = null;

            // Project the km axis onto a date (estimatedDueAt). Used both
            // for sorting the timeline and for buffer/Earliest/Latest logic.
            DateTime? estimatedDueAt = nextDueAt;
            int? estimatedKmRemaining = null;
            if (nextDueKm is not null)
            {
                var remaining = nextDueKm.Value - currentKm;
                estimatedKmRemaining = remaining;
                var daysToReach = remaining > 0 && dailyKm > 0
                    ? (int)Math.Round(remaining / dailyKm)
                    : 0;
                var projectedKmDate = DateTime.SpecifyKind(context.Now.AddDays(daysToReach), DateTimeKind.Utc);
                estimatedDueAt = nextDueAt.HasValue
                    ? (projectedKmDate < nextDueAt.Value ? projectedKmDate : nextDueAt.Value)
                    : projectedKmDate;
            }

            // For Earliest / Latest, normalise both axes by approximating
            // mileage projection so we can compare and pick one.
            if (item.Trigger is MaintenanceItemTrigger.Earliest or MaintenanceItemTrigger.Latest
                && nextDueAt.HasValue && nextDueKm.HasValue)
            {
                var kmProjectedAt = ProjectKmReach(currentKm, nextDueKm.Value, context.Now, dailyKm);
                var pickEarliest = item.Trigger == MaintenanceItemTrigger.Earliest;
                var pickKm = pickEarliest
                    ? kmProjectedAt < nextDueAt.Value
                    : kmProjectedAt > nextDueAt.Value;
                if (pickKm) nextDueAt = null; else nextDueKm = null;
            }

            // Confidence-based safety buffer: only emit "à venir" events when
            // we're inside the lead window. Items farther out stay silent
            // until tomorrow's regeneration brings them into range.
            if (!IsWithinBuffer(confidence, estimatedKmRemaining, estimatedDueAt, context.Now))
                continue;

            var description = BuildDescription(
                item, vehicle, lastDone, nextDueAt, nextDueKm, context.Now,
                estimate, estimatedKmRemaining, estimatedDueAt);

            yield return new TimelineEvent
            {
                OrganizationId = vehicle.OrganizationId,
                VehicleId = vehicle.Id,
                CustomerId = vehicle.CustomerId,
                Kind = TimelineEventKind.Maintenance,
                Title = $"{item.Title} — {modelDisplayName}",
                Description = description,
                DueAt = nextDueAt,
                DueMileage = nextDueKm,
                Status = TimelineEventStatus.Pending,
                Source = TimelineEventSource.AutoGenerated,
                GeneratedFromRule = $"Program:{program.Id}:{item.Code}",
                ItemCode = item.Code,
                Severity = item.Severity,
                EstimatedDueAt = estimatedDueAt,
                EstimatedKmRemaining = estimatedKmRemaining,
                MileageConfidenceAtGeneration = confidence?.ToString()
            };
        }
    }

    private static bool IsWithinBuffer(
        MileageConfidence? confidence,
        int? kmRemaining,
        DateTime? estimatedDueAt,
        DateTime now)
    {
        // No estimate yet: legacy behaviour — always emit.
        if (confidence is null) return true;

        // Already overdue or due now → always emit.
        if (kmRemaining is <= 0) return true;
        if (estimatedDueAt.HasValue && estimatedDueAt.Value <= now) return true;

        var (kmBuffer, dayBuffer) = confidence switch
        {
            MileageConfidence.High => (1500, 30),
            MileageConfidence.Medium => (3000, 45),
            _ => (5000, 60),
        };

        if (kmRemaining is not null && kmRemaining.Value <= kmBuffer) return true;
        if (estimatedDueAt.HasValue
            && (estimatedDueAt.Value - now).TotalDays <= dayBuffer) return true;

        return false;
    }

    private static DateTime ProjectKmReach(int currentKm, int targetKm, DateTime now, double dailyKm)
    {
        if (targetKm <= currentKm) return now;
        var remaining = targetKm - currentKm;
        var rate = dailyKm > 0 ? dailyKm : FallbackDailyKm;
        var days = Math.Max(1, (int)Math.Round(remaining / rate));
        return DateTime.SpecifyKind(now.AddDays(days), DateTimeKind.Utc);
    }

    private static string BuildDescription(
        MaintenanceProgramItem item,
        Vehicle vehicle,
        MaintenanceRecord? lastDone,
        DateTime? nextDueAt,
        int? nextDueKm,
        DateTime now,
        MileageEstimate? estimate,
        int? estimatedKmRemaining,
        DateTime? estimatedDueAt)
    {
        var parts = new List<string>();

        if (lastDone is not null)
        {
            var months = (int)Math.Round((now - lastDone.PerformedAt).TotalDays / 30.0);
            parts.Add($"Dernier passage il y a {months} mois @ {lastDone.MileageAtService:N0} km.");
        }
        else
        {
            parts.Add("Jamais effectué dans l'historique enregistré.");
        }

        if (estimate is not null)
        {
            parts.Add($"Estimation actuelle : ~{estimate.EstimatedKm:N0} km ({FrenchConfidence(estimate.Confidence)}).");
        }

        if (nextDueKm is not null)
        {
            var diff = estimatedKmRemaining ?? (nextDueKm.Value - vehicle.CurrentMileage);
            parts.Add(diff > 0
                ? $"Prochain à {nextDueKm.Value:N0} km — dans environ {diff:N0} km."
                : $"En retard : prévu à {nextDueKm.Value:N0} km, le véhicule en est à {vehicle.CurrentMileage:N0} km.");
        }
        if (nextDueAt is not null)
        {
            var days = (int)Math.Round((nextDueAt.Value - now).TotalDays);
            parts.Add(days > 0
                ? $"Échéance temps : dans {days} jours."
                : $"En retard de {Math.Abs(days)} jours.");
        }
        else if (estimatedDueAt is not null && nextDueKm is not null)
        {
            var days = (int)Math.Round((estimatedDueAt.Value - now).TotalDays);
            if (days > 0) parts.Add($"Au rythme actuel : dans ~{days} jours.");
        }

        if (item.EstimatedCostMin.HasValue && item.EstimatedCostMax.HasValue)
        {
            parts.Add($"Coût indicatif : {item.EstimatedCostMin:0}–{item.EstimatedCostMax:0} €.");
        }

        return string.Join(" ", parts);
    }

    private static string FrenchConfidence(MileageConfidence confidence) => confidence switch
    {
        MileageConfidence.High => "confiance élevée",
        MileageConfidence.Medium => "confiance moyenne",
        _ => "confiance faible"
    };
}
