using CarHorizontal.Api.Modules.Reminders.Dtos;
using CarHorizontal.Domain.Entities.Messaging;
using CarHorizontal.Domain.Entities.Reminders;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Reminders;

public class RemindersService : IRemindersService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public RemindersService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<ReminderListResponseDto> ListAsync(ReminderListRequestDto request, CancellationToken ct = default)
    {
        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize switch
        {
            <= 0 => 50,
            > 200 => 200,
            _ => request.PageSize
        };

        var query = _db.Reminders.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Status)
            && Enum.TryParse<ReminderStatus>(request.Status, ignoreCase: true, out var statusEnum))
        {
            query = query.Where(r => r.Status == statusEnum);
        }

        if (!string.IsNullOrWhiteSpace(request.Channel)
            && Enum.TryParse<MessageChannel>(request.Channel, ignoreCase: true, out var channelEnum))
        {
            query = query.Where(r => r.Channel == channelEnum);
        }

        if (request.From.HasValue)
        {
            var from = DateTime.SpecifyKind(request.From.Value, DateTimeKind.Utc);
            query = query.Where(r => r.ScheduledAt >= from);
        }

        if (request.To.HasValue)
        {
            var to = DateTime.SpecifyKind(request.To.Value, DateTimeKind.Utc);
            query = query.Where(r => r.ScheduledAt <= to);
        }

        if (request.CustomerId.HasValue) query = query.Where(r => r.CustomerId == request.CustomerId.Value);
        if (request.VehicleId.HasValue) query = query.Where(r => r.VehicleId == request.VehicleId.Value);

        var total = await query.CountAsync(ct);

        var sortDir = string.Equals(request.SortDir, "desc", StringComparison.OrdinalIgnoreCase) ? "desc" : "asc";
        query = sortDir == "desc"
            ? query.OrderByDescending(r => r.ScheduledAt).ThenByDescending(r => r.CreatedAt)
            : query.OrderBy(r => r.ScheduledAt).ThenBy(r => r.CreatedAt);

        var rawItems = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id,
                r.CustomerId,
                r.VehicleId,
                r.TimelineEventId,
                r.Channel,
                r.ScheduledAt,
                r.SentAt,
                r.Status,
                r.TemplateId,
                r.ResolvedSubject,
                r.ResolvedBody,
                r.FailureReason,
                r.CreatedAt,
                r.UpdatedAt,
                CustomerFullName = _db.Customers
                    .Where(c => c.Id == r.CustomerId)
                    .Select(c => c.FullName)
                    .FirstOrDefault() ?? string.Empty,
                Vehicle = r.VehicleId == null ? null : _db.Vehicles
                    .Where(v => v.Id == r.VehicleId)
                    .Select(v => new { v.Make, v.Model, v.LicensePlate })
                    .FirstOrDefault(),
                TimelineEventTitle = r.TimelineEventId == null ? null : _db.TimelineEvents
                    .Where(t => t.Id == r.TimelineEventId)
                    .Select(t => t.Title)
                    .FirstOrDefault()
            })
            .ToListAsync(ct);

        var items = rawItems.Select(x => new ReminderDto
        {
            Id = x.Id,
            CustomerId = x.CustomerId,
            CustomerFullName = x.CustomerFullName,
            VehicleId = x.VehicleId,
            VehicleLabel = x.Vehicle is null ? null : $"{x.Vehicle.Make} {x.Vehicle.Model}".Trim(),
            LicensePlate = x.Vehicle?.LicensePlate,
            TimelineEventId = x.TimelineEventId,
            TimelineEventTitle = x.TimelineEventTitle,
            Channel = x.Channel.ToString(),
            ScheduledAt = x.ScheduledAt,
            SentAt = x.SentAt,
            Status = x.Status.ToString(),
            TemplateId = x.TemplateId,
            ResolvedSubject = x.ResolvedSubject,
            ResolvedBody = x.ResolvedBody,
            FailureReason = x.FailureReason,
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt
        }).ToList();

        return new ReminderListResponseDto
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Items = items
        };
    }

    public Task<ReminderDto> GetAsync(Guid id, CancellationToken ct = default) => GetDtoAsync(id, ct);

    public async Task<ReminderDto> CreateAsync(CreateReminderRequestDto request, CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");

        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == request.CustomerId, ct)
            ?? throw new KeyNotFoundException($"Customer {request.CustomerId} not found.");

        Guid? vehicleId = null;
        if (request.VehicleId.HasValue)
        {
            var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == request.VehicleId.Value, ct)
                ?? throw new KeyNotFoundException($"Vehicle {request.VehicleId} not found.");
            if (vehicle.CustomerId != customer.Id)
            {
                throw new InvalidOperationException("Vehicle does not belong to the specified customer.");
            }
            vehicleId = vehicle.Id;
        }

        if (request.TimelineEventId.HasValue)
        {
            var exists = await _db.TimelineEvents
                .AnyAsync(t => t.Id == request.TimelineEventId.Value, ct);
            if (!exists) throw new KeyNotFoundException($"Timeline event {request.TimelineEventId} not found.");
        }

        var entity = new Reminder
        {
            OrganizationId = orgId,
            CustomerId = customer.Id,
            VehicleId = vehicleId,
            TimelineEventId = request.TimelineEventId,
            Channel = Enum.Parse<MessageChannel>(request.Channel, ignoreCase: true),
            ScheduledAt = DateTime.SpecifyKind(request.ScheduledAt, DateTimeKind.Utc),
            Status = ReminderStatus.Scheduled,
            TemplateId = request.TemplateId,
            ResolvedSubject = NormalizeOptional(request.ResolvedSubject),
            ResolvedBody = NormalizeOptional(request.ResolvedBody)
        };

        _db.Reminders.Add(entity);
        await _db.SaveChangesAsync(ct);

        return await GetDtoAsync(entity.Id, ct);
    }

    public async Task<ReminderDto> UpdateAsync(Guid id, UpdateReminderRequestDto request, CancellationToken ct = default)
    {
        var entity = await _db.Reminders.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException($"Reminder {id} not found.");

        EnsureMutable(entity, "update");

        if (request.Channel is not null)
            entity.Channel = Enum.Parse<MessageChannel>(request.Channel, ignoreCase: true);
        if (request.ScheduledAt.HasValue)
            entity.ScheduledAt = DateTime.SpecifyKind(request.ScheduledAt.Value, DateTimeKind.Utc);

        if (request.ClearTemplate) entity.TemplateId = null;
        else if (request.TemplateId.HasValue) entity.TemplateId = request.TemplateId.Value;

        if (request.ResolvedSubject is not null)
            entity.ResolvedSubject = NormalizeOptional(request.ResolvedSubject);
        if (request.ResolvedBody is not null)
            entity.ResolvedBody = NormalizeOptional(request.ResolvedBody);

        if (entity.Status == ReminderStatus.Snoozed) entity.Status = ReminderStatus.Scheduled;

        await _db.SaveChangesAsync(ct);
        return await GetDtoAsync(entity.Id, ct);
    }

    public async Task<ReminderDto> CancelAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Reminders.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException($"Reminder {id} not found.");

        if (entity.Status == ReminderStatus.Sent)
            throw new InvalidOperationException("A reminder that has already been sent cannot be cancelled.");
        if (entity.Status == ReminderStatus.Cancelled)
            return await GetDtoAsync(entity.Id, ct);

        entity.Status = ReminderStatus.Cancelled;
        await _db.SaveChangesAsync(ct);
        return await GetDtoAsync(entity.Id, ct);
    }

    public async Task<ReminderDto> SendNowAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Reminders.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException($"Reminder {id} not found.");

        if (entity.Status == ReminderStatus.Sent)
            throw new InvalidOperationException("Reminder has already been sent.");
        if (entity.Status == ReminderStatus.Cancelled)
            throw new InvalidOperationException("A cancelled reminder cannot be sent.");

        // Phase 8 placeholder: actual SMS/Email dispatch is wired up in Phase 9 (T090).
        // For now, mark as sent immediately so the workflow is testable end-to-end.
        entity.Status = ReminderStatus.Sent;
        entity.SentAt = DateTime.UtcNow;
        entity.FailureReason = null;

        await _db.SaveChangesAsync(ct);
        return await GetDtoAsync(entity.Id, ct);
    }

    public async Task<ReminderDto> SnoozeAsync(Guid id, SnoozeReminderRequestDto request, CancellationToken ct = default)
    {
        var entity = await _db.Reminders.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException($"Reminder {id} not found.");

        EnsureMutable(entity, "snooze");

        var current = entity.ScheduledAt;
        if (current.Kind != DateTimeKind.Utc) current = DateTime.SpecifyKind(current, DateTimeKind.Utc);
        entity.ScheduledAt = current.AddDays(request.Days);
        entity.Status = ReminderStatus.Snoozed;

        await _db.SaveChangesAsync(ct);
        return await GetDtoAsync(entity.Id, ct);
    }

    public async Task<ReminderDto> CreateFromTimelineEventAsync(
        Guid timelineEventId,
        CreateFromTimelineRequestDto request,
        CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");

        var timelineEvent = await _db.TimelineEvents
            .FirstOrDefaultAsync(t => t.Id == timelineEventId, ct)
            ?? throw new KeyNotFoundException($"Timeline event {timelineEventId} not found.");

        var channel = !string.IsNullOrWhiteSpace(request.Channel)
            ? Enum.Parse<MessageChannel>(request.Channel, ignoreCase: true)
            : MessageChannel.Email;

        var scheduledAt = request.ScheduledAt.HasValue
            ? DateTime.SpecifyKind(request.ScheduledAt.Value, DateTimeKind.Utc)
            : ComputeDefaultScheduledAt(timelineEvent.DueAt);

        var existing = await _db.Reminders
            .Where(r => r.TimelineEventId == timelineEventId
                && (r.Status == ReminderStatus.Scheduled || r.Status == ReminderStatus.Snoozed))
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (existing is not null) return await GetDtoAsync(existing.Id, ct);

        var entity = new Reminder
        {
            OrganizationId = orgId,
            CustomerId = timelineEvent.CustomerId,
            VehicleId = timelineEvent.VehicleId,
            TimelineEventId = timelineEvent.Id,
            Channel = channel,
            ScheduledAt = scheduledAt,
            Status = ReminderStatus.Scheduled,
            TemplateId = request.TemplateId
        };

        _db.Reminders.Add(entity);
        await _db.SaveChangesAsync(ct);

        return await GetDtoAsync(entity.Id, ct);
    }

    private static void EnsureMutable(Reminder entity, string action)
    {
        if (entity.Status == ReminderStatus.Sent)
            throw new InvalidOperationException($"Cannot {action} a reminder that has already been sent.");
        if (entity.Status == ReminderStatus.Cancelled)
            throw new InvalidOperationException($"Cannot {action} a cancelled reminder.");
    }

    private static DateTime ComputeDefaultScheduledAt(DateTime? dueAt)
    {
        if (!dueAt.HasValue) return DateTime.UtcNow;
        var due = dueAt.Value.Kind == DateTimeKind.Utc
            ? dueAt.Value
            : DateTime.SpecifyKind(dueAt.Value, DateTimeKind.Utc);
        var candidate = due.AddDays(-14);
        return candidate < DateTime.UtcNow ? DateTime.UtcNow : candidate;
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }

    private async Task<ReminderDto> GetDtoAsync(Guid id, CancellationToken ct)
    {
        var raw = await _db.Reminders.AsNoTracking()
            .Where(r => r.Id == id)
            .Select(r => new
            {
                r.Id,
                r.CustomerId,
                r.VehicleId,
                r.TimelineEventId,
                r.Channel,
                r.ScheduledAt,
                r.SentAt,
                r.Status,
                r.TemplateId,
                r.ResolvedSubject,
                r.ResolvedBody,
                r.FailureReason,
                r.CreatedAt,
                r.UpdatedAt,
                CustomerFullName = _db.Customers
                    .Where(c => c.Id == r.CustomerId)
                    .Select(c => c.FullName)
                    .FirstOrDefault() ?? string.Empty,
                Vehicle = r.VehicleId == null ? null : _db.Vehicles
                    .Where(v => v.Id == r.VehicleId)
                    .Select(v => new { v.Make, v.Model, v.LicensePlate })
                    .FirstOrDefault(),
                TimelineEventTitle = r.TimelineEventId == null ? null : _db.TimelineEvents
                    .Where(t => t.Id == r.TimelineEventId)
                    .Select(t => t.Title)
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException($"Reminder {id} not found.");

        return new ReminderDto
        {
            Id = raw.Id,
            CustomerId = raw.CustomerId,
            CustomerFullName = raw.CustomerFullName,
            VehicleId = raw.VehicleId,
            VehicleLabel = raw.Vehicle is null ? null : $"{raw.Vehicle.Make} {raw.Vehicle.Model}".Trim(),
            LicensePlate = raw.Vehicle?.LicensePlate,
            TimelineEventId = raw.TimelineEventId,
            TimelineEventTitle = raw.TimelineEventTitle,
            Channel = raw.Channel.ToString(),
            ScheduledAt = raw.ScheduledAt,
            SentAt = raw.SentAt,
            Status = raw.Status.ToString(),
            TemplateId = raw.TemplateId,
            ResolvedSubject = raw.ResolvedSubject,
            ResolvedBody = raw.ResolvedBody,
            FailureReason = raw.FailureReason,
            CreatedAt = raw.CreatedAt,
            UpdatedAt = raw.UpdatedAt
        };
    }
}
