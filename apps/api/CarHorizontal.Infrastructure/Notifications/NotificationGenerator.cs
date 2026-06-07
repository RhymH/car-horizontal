using System.Globalization;
using CarHorizontal.Domain.Entities.Catalog;
using CarHorizontal.Domain.Entities.Customers;
using CarHorizontal.Domain.Entities.Notifications;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Domain.Notifications;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Infrastructure.Notifications;

/// <summary>
/// Builds staff notifications from two sources:
/// 1. Upcoming or overdue timeline events (maintenance, inspection, tyre swap,
///    trade-in opportunity, warranty expiry).
/// 2. Customers that have gone quiet for ≈12 months (reactivation opportunity).
/// Idempotent via <see cref="Notification.DedupKey"/>: a notification that already
/// exists for a key — including ones already handled or dismissed — is never
/// recreated, so handled items don't resurface on the next run.
/// </summary>
public class NotificationGenerator : INotificationGenerator
{
    private const int TimelineLookaheadDays = 30;
    private const int InactivityDays = 365;

    private static readonly CultureInfo Fr = CultureInfo.GetCultureInfo("fr-FR");

    private readonly AppDbContext _db;
    private readonly TimeProvider _clock;

    public NotificationGenerator(AppDbContext db, TimeProvider? clock = null)
    {
        _db = db;
        _clock = clock ?? TimeProvider.System;
    }

    public Task<int> GenerateAsync(CancellationToken ct = default)
        => GenerateCoreAsync(null, ct);

    public Task<int> GenerateForOrganizationAsync(Guid organizationId, CancellationToken ct = default)
        => GenerateCoreAsync(organizationId, ct);

    private async Task<int> GenerateCoreAsync(Guid? organizationId, CancellationToken ct)
    {
        var now = _clock.GetUtcNow().UtcDateTime;

        var created = 0;
        var existingKeys = await LoadExistingDedupKeysAsync(organizationId, ct);

        created += await GenerateFromTimelineAsync(organizationId, now, existingKeys, ct);
        created += await GenerateInactiveCustomersAsync(organizationId, now, existingKeys, ct);

        if (created > 0) await _db.SaveChangesAsync(ct);
        return created;
    }

    /// <summary>
    /// Loads dedup keys for <em>every</em> existing notification (any status), so a
    /// notification that has already been raised — including ones already handled
    /// (Done) or dismissed — is never recreated. A genuinely new obligation yields a
    /// new key (timeline events are keyed by their unique id), so fresh signals still
    /// surface.
    /// </summary>
    private async Task<HashSet<string>> LoadExistingDedupKeysAsync(Guid? organizationId, CancellationToken ct)
    {
        var query = _db.Notifications
            .IgnoreQueryFilters()
            .Where(n => n.DeletedAt == null);

        if (organizationId is { } org)
            query = query.Where(n => n.OrganizationId == org);

        var keys = await query.Select(n => n.DedupKey).ToListAsync(ct);
        return keys.ToHashSet(StringComparer.Ordinal);
    }

    private async Task<int> GenerateFromTimelineAsync(
        Guid? organizationId,
        DateTime now,
        HashSet<string> existingKeys,
        CancellationToken ct)
    {
        var horizon = now.AddDays(TimelineLookaheadDays);

        var query = _db.TimelineEvents
            .IgnoreQueryFilters()
            .Where(t => t.DeletedAt == null
                && (t.Status == TimelineEventStatus.Pending || t.Status == TimelineEventStatus.Triggered)
                && t.DueAt != null
                && t.DueAt <= horizon);

        if (organizationId is { } org)
            query = query.Where(t => t.OrganizationId == org);

        var events = await query
            .Select(t => new
            {
                t.Id,
                t.OrganizationId,
                t.CustomerId,
                t.VehicleId,
                t.Kind,
                t.DueAt,
                t.Title,
                t.Severity,
                CustomerName = _db.Customers.IgnoreQueryFilters()
                    .Where(c => c.Id == t.CustomerId).Select(c => c.FullName).FirstOrDefault(),
                Vehicle = _db.Vehicles.IgnoreQueryFilters()
                    .Where(v => v.Id == t.VehicleId)
                    .Select(v => new { v.Make, v.Model, v.LicensePlate }).FirstOrDefault()
            })
            .ToListAsync(ct);

        var created = 0;
        foreach (var ev in events)
        {
            var key = $"timeline:{ev.Id}";
            if (!existingKeys.Add(key)) continue; // already raised

            var vehicleLabel = ev.Vehicle is null
                ? "le véhicule"
                : $"{ev.Vehicle.Make} {ev.Vehicle.Model}".Trim();
            var plate = string.IsNullOrWhiteSpace(ev.Vehicle?.LicensePlate) ? "" : $" ({ev.Vehicle!.LicensePlate})";
            var overdue = ev.DueAt < now;
            var when = ev.DueAt.HasValue ? ev.DueAt.Value.ToString("d MMMM yyyy", Fr) : null;

            var (kind, action) = MapKind(ev.Kind);
            var severity = ResolveSeverity(ev.Kind, ev.Severity, overdue);

            var title = BuildTitle(kind, ev.Title, overdue);
            var message = BuildMessage(kind, ev.CustomerName, vehicleLabel + plate, when, overdue);

            _db.Notifications.Add(new Notification
            {
                OrganizationId = ev.OrganizationId,
                CustomerId = ev.CustomerId,
                VehicleId = ev.VehicleId,
                TimelineEventId = ev.Id,
                Kind = kind,
                Severity = severity,
                Action = action,
                Title = title,
                Message = message,
                DueAt = ev.DueAt,
                DedupKey = key,
                Status = NotificationStatus.New
            });
            created++;
        }

        return created;
    }

    private async Task<int> GenerateInactiveCustomersAsync(
        Guid? organizationId,
        DateTime now,
        HashSet<string> existingKeys,
        CancellationToken ct)
    {
        var cutoff = now.AddDays(-InactivityDays);

        var customersQuery = _db.Customers
            .IgnoreQueryFilters()
            .Where(c => c.DeletedAt == null && c.Status == CustomerStatus.Active);

        if (organizationId is { } org)
            customersQuery = customersQuery.Where(c => c.OrganizationId == org);

        var customers = await customersQuery
            .Select(c => new
            {
                c.Id,
                c.OrganizationId,
                c.FullName,
                c.AcquiredAt,
                LastInteractionAt = _db.CustomerInteractions.IgnoreQueryFilters()
                    .Where(i => i.CustomerId == c.Id && i.DeletedAt == null)
                    .Max(i => (DateTime?)i.OccurredAt)
            })
            .ToListAsync(ct);

        var created = 0;
        foreach (var c in customers)
        {
            var lastActivity = c.LastInteractionAt ?? c.AcquiredAt;
            if (lastActivity >= cutoff) continue;

            var key = $"inactive:{c.Id}";
            if (!existingKeys.Add(key)) continue;

            var months = Math.Max(1, (int)Math.Round((now - lastActivity).TotalDays / 30.0));

            _db.Notifications.Add(new Notification
            {
                OrganizationId = c.OrganizationId,
                CustomerId = c.Id,
                VehicleId = null,
                TimelineEventId = null,
                Kind = NotificationKind.InactiveCustomer,
                Severity = NotificationSeverity.Opportunity,
                Action = NotificationAction.ViewCustomer,
                Title = "Client inactif à relancer",
                Message = $"{c.FullName} n'a plus eu d'activité depuis environ {months} mois. " +
                          "Un petit message de prise de nouvelles peut le faire revenir à l'atelier.",
                DueAt = null,
                DedupKey = key,
                Status = NotificationStatus.New
            });
            created++;
        }

        return created;
    }

    private static (NotificationKind Kind, NotificationAction Action) MapKind(TimelineEventKind kind) => kind switch
    {
        TimelineEventKind.Maintenance => (NotificationKind.MaintenanceDue, NotificationAction.CreateAppointment),
        TimelineEventKind.TechnicalInspection => (NotificationKind.InspectionDue, NotificationAction.CreateAppointment),
        TimelineEventKind.TireSwap => (NotificationKind.TireSwapDue, NotificationAction.CreateAppointment),
        TimelineEventKind.TradeInOpportunity => (NotificationKind.TradeInOpportunity, NotificationAction.ViewCustomer),
        TimelineEventKind.WarrantyExpiry => (NotificationKind.WarrantyExpiring, NotificationAction.ViewCustomer),
        _ => (NotificationKind.MaintenanceDue, NotificationAction.ViewVehicle)
    };

    private static NotificationSeverity ResolveSeverity(
        TimelineEventKind kind,
        MaintenanceItemSeverity? itemSeverity,
        bool overdue)
    {
        // Opportunities stay "opportunity" — they are not time-critical chores.
        if (kind is TimelineEventKind.TradeInOpportunity or TimelineEventKind.WarrantyExpiry)
            return NotificationSeverity.Opportunity;

        if (overdue) return NotificationSeverity.Critical;

        return itemSeverity switch
        {
            MaintenanceItemSeverity.Critical => NotificationSeverity.Critical,
            MaintenanceItemSeverity.Recommended => NotificationSeverity.Warning,
            _ => NotificationSeverity.Info
        };
    }

    private static string BuildTitle(NotificationKind kind, string? eventTitle, bool overdue) => kind switch
    {
        NotificationKind.MaintenanceDue => overdue ? "Entretien en retard" : "Entretien à prévoir",
        NotificationKind.InspectionDue => overdue ? "Contrôle technique dépassé" : "Contrôle technique à venir",
        NotificationKind.TireSwapDue => "Changement de pneus à prévoir",
        NotificationKind.TradeInOpportunity => "Opportunité de reprise",
        NotificationKind.WarrantyExpiring => "Fin de garantie proche",
        _ => string.IsNullOrWhiteSpace(eventTitle) ? "Échéance véhicule" : eventTitle
    };

    private static string BuildMessage(
        NotificationKind kind,
        string? customerName,
        string vehicleLabel,
        string? when,
        bool overdue)
    {
        var who = string.IsNullOrWhiteSpace(customerName) ? "Le client" : customerName;
        var date = when is null ? "" : overdue ? $" (échéance dépassée le {when})" : $" pour le {when}";

        return kind switch
        {
            NotificationKind.MaintenanceDue =>
                $"{who} : un entretien est à prévoir sur {vehicleLabel}{date}. Proposez un rendez-vous.",
            NotificationKind.InspectionDue =>
                $"{who} : le contrôle technique de {vehicleLabel} arrive à échéance{date}. Anticipez la prise de rendez-vous.",
            NotificationKind.TireSwapDue =>
                $"{who} : la saison du changement de pneus approche pour {vehicleLabel}{date}.",
            NotificationKind.TradeInOpportunity =>
                $"{who} : {vehicleLabel} atteint un profil intéressant pour une reprise. Une proposition peut être pertinente.",
            NotificationKind.WarrantyExpiring =>
                $"{who} : la garantie de {vehicleLabel} expire bientôt{date}. C'est le moment d'en parler.",
            _ => $"{who} : une échéance approche pour {vehicleLabel}{date}."
        };
    }
}
