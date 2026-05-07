using CarHorizontal.Domain.Entities.Messaging;
using CarHorizontal.Domain.Entities.Reminders;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Infrastructure.Reminders;

public class AutoReminderScheduler : IAutoReminderScheduler
{
    private readonly AppDbContext _db;
    private readonly TimeProvider _clock;

    public AutoReminderScheduler(AppDbContext db, TimeProvider? clock = null)
    {
        _db = db;
        _clock = clock ?? TimeProvider.System;
    }

    public async Task<int> EnsureRemindersAsync(CancellationToken ct = default)
    {
        var now = _clock.GetUtcNow().UtcDateTime;
        var horizon = now.AddDays(ReminderLeadTimes.LookaheadDays);

        var candidates = await _db.TimelineEvents
            .IgnoreQueryFilters()
            .Where(t => t.DeletedAt == null
                && t.Status == TimelineEventStatus.Pending
                && t.DueAt != null
                && t.DueAt <= horizon)
            .ToListAsync(ct);

        return await CreateMissingRemindersAsync(candidates, now, ct);
    }

    public async Task<int> EnsureRemindersForOrganizationAsync(Guid organizationId, CancellationToken ct = default)
    {
        var now = _clock.GetUtcNow().UtcDateTime;
        var horizon = now.AddDays(ReminderLeadTimes.LookaheadDays);

        var candidates = await _db.TimelineEvents
            .IgnoreQueryFilters()
            .Where(t => t.DeletedAt == null
                && t.OrganizationId == organizationId
                && t.Status == TimelineEventStatus.Pending
                && t.DueAt != null
                && t.DueAt <= horizon)
            .ToListAsync(ct);

        return await CreateMissingRemindersAsync(candidates, now, ct);
    }

    private async Task<int> CreateMissingRemindersAsync(
        List<TimelineEvent> candidates,
        DateTime now,
        CancellationToken ct)
    {
        if (candidates.Count == 0) return 0;

        var ids = candidates.Select(c => c.Id).ToHashSet();
        var alreadyLinked = await _db.Reminders
            .IgnoreQueryFilters()
            .Where(r => r.DeletedAt == null
                && r.TimelineEventId != null
                && ids.Contains(r.TimelineEventId!.Value)
                && (r.Status == ReminderStatus.Scheduled
                    || r.Status == ReminderStatus.Snoozed
                    || r.Status == ReminderStatus.Sent))
            .Select(r => r.TimelineEventId!.Value)
            .ToListAsync(ct);

        var alreadySet = alreadyLinked.ToHashSet();

        var ordered = candidates
            .OrderBy(c => c.Severity ?? Domain.Entities.Catalog.MaintenanceItemSeverity.Optional)
            .ThenBy(c => c.DueAt);

        var created = 0;
        foreach (var ev in ordered)
        {
            if (alreadySet.Contains(ev.Id)) continue;
            if (!ev.DueAt.HasValue) continue;

            var dueAt = ev.DueAt.Value.Kind == DateTimeKind.Utc
                ? ev.DueAt.Value
                : DateTime.SpecifyKind(ev.DueAt.Value, DateTimeKind.Utc);

            var lead = ReminderLeadTimes.ForEvent(ev);
            var scheduledAt = dueAt.AddDays(-lead);
            if (scheduledAt < now) scheduledAt = now;

            _db.Reminders.Add(new Reminder
            {
                OrganizationId = ev.OrganizationId,
                TimelineEventId = ev.Id,
                CustomerId = ev.CustomerId,
                VehicleId = ev.VehicleId,
                Channel = MessageChannel.Email,
                ScheduledAt = scheduledAt,
                Status = ReminderStatus.Scheduled,
                ItemCode = ev.ItemCode,
                Severity = ev.Severity
            });
            created++;
        }

        if (created > 0) await _db.SaveChangesAsync(ct);
        return created;
    }
}
