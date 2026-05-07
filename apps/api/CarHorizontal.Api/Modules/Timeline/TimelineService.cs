using CarHorizontal.Api.Modules.Timeline.Dtos;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Infrastructure.Persistence;
using CarHorizontal.Infrastructure.Timeline;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Timeline;

public class TimelineService : ITimelineService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly ITimelineEngine _timelineEngine;

    public TimelineService(AppDbContext db, ICurrentUserService currentUser, ITimelineEngine timelineEngine)
    {
        _db = db;
        _currentUser = currentUser;
        _timelineEngine = timelineEngine;
    }

    public async Task<TimelineListResponseDto> ListAsync(TimelineListRequestDto request, CancellationToken ct = default)
    {
        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize switch
        {
            <= 0 => 50,
            > 200 => 200,
            _ => request.PageSize
        };

        var query = _db.TimelineEvents.AsNoTracking().AsQueryable();

        if (request.VehicleId.HasValue) query = query.Where(t => t.VehicleId == request.VehicleId.Value);
        if (request.CustomerId.HasValue) query = query.Where(t => t.CustomerId == request.CustomerId.Value);

        if (request.From.HasValue)
        {
            var from = DateTime.SpecifyKind(request.From.Value, DateTimeKind.Utc);
            query = query.Where(t => t.DueAt >= from);
        }

        if (request.To.HasValue)
        {
            var to = DateTime.SpecifyKind(request.To.Value, DateTimeKind.Utc);
            query = query.Where(t => t.DueAt <= to);
        }

        if (!string.IsNullOrWhiteSpace(request.Status)
            && Enum.TryParse<TimelineEventStatus>(request.Status, ignoreCase: true, out var statusEnum))
        {
            query = query.Where(t => t.Status == statusEnum);
        }

        if (!string.IsNullOrWhiteSpace(request.Kind)
            && Enum.TryParse<TimelineEventKind>(request.Kind, ignoreCase: true, out var kindEnum))
        {
            query = query.Where(t => t.Kind == kindEnum);
        }

        var total = await query.CountAsync(ct);

        var sortDir = string.Equals(request.SortDir, "desc", StringComparison.OrdinalIgnoreCase) ? "desc" : "asc";
        query = sortDir == "desc"
            ? query.OrderByDescending(t => t.DueAt ?? DateTime.MaxValue).ThenByDescending(t => t.CreatedAt)
            : query.OrderBy(t => t.DueAt ?? DateTime.MaxValue).ThenBy(t => t.CreatedAt);

        var rawItems = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new
            {
                t.Id,
                t.VehicleId,
                t.CustomerId,
                t.Kind,
                t.Title,
                t.Description,
                t.DueAt,
                t.DueMileage,
                t.Status,
                t.Source,
                t.GeneratedFromRule,
                t.ItemCode,
                t.Severity,
                t.EstimatedDueAt,
                t.EstimatedKmRemaining,
                t.MileageConfidenceAtGeneration,
                t.CreatedAt,
                t.UpdatedAt,
                Vehicle = _db.Vehicles
                    .Where(v => v.Id == t.VehicleId)
                    .Select(v => new { v.Make, v.Model, v.LicensePlate })
                    .FirstOrDefault(),
                CustomerFullName = _db.Customers
                    .Where(c => c.Id == t.CustomerId)
                    .Select(c => c.FullName)
                    .FirstOrDefault() ?? string.Empty
            })
            .ToListAsync(ct);

        var items = rawItems.Select(x => new TimelineEventDto
        {
            Id = x.Id,
            VehicleId = x.VehicleId,
            CustomerId = x.CustomerId,
            VehicleLabel = x.Vehicle is null
                ? string.Empty
                : $"{x.Vehicle.Make} {x.Vehicle.Model}".Trim(),
            LicensePlate = x.Vehicle?.LicensePlate ?? string.Empty,
            CustomerFullName = x.CustomerFullName,
            Kind = x.Kind.ToString(),
            Title = x.Title,
            Description = x.Description,
            DueAt = x.DueAt,
            DueMileage = x.DueMileage,
            Status = x.Status.ToString(),
            Source = x.Source.ToString(),
            GeneratedFromRule = x.GeneratedFromRule,
            ItemCode = x.ItemCode,
            Severity = x.Severity?.ToString(),
            EstimatedDueAt = x.EstimatedDueAt,
            EstimatedKmRemaining = x.EstimatedKmRemaining,
            MileageConfidenceAtGeneration = x.MileageConfidenceAtGeneration,
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt
        }).ToList();

        return new TimelineListResponseDto
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Items = items
        };
    }

    public async Task<TimelineEventDto> CreateAsync(CreateTimelineEventRequestDto request, CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");

        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == request.VehicleId, ct)
            ?? throw new KeyNotFoundException($"Vehicle {request.VehicleId} not found.");

        var entity = new TimelineEvent
        {
            OrganizationId = orgId,
            VehicleId = vehicle.Id,
            CustomerId = vehicle.CustomerId,
            Kind = Enum.Parse<TimelineEventKind>(request.Kind, ignoreCase: true),
            Title = request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            DueAt = request.DueAt.HasValue ? DateTime.SpecifyKind(request.DueAt.Value, DateTimeKind.Utc) : null,
            DueMileage = request.DueMileage,
            Status = TimelineEventStatus.Pending,
            Source = TimelineEventSource.Manual
        };

        _db.TimelineEvents.Add(entity);
        await _db.SaveChangesAsync(ct);

        return await GetDtoAsync(entity.Id, ct);
    }

    public async Task<TimelineEventDto> UpdateAsync(Guid id, UpdateTimelineEventRequestDto request, CancellationToken ct = default)
    {
        var entity = await _db.TimelineEvents.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new KeyNotFoundException($"Timeline event {id} not found.");

        if (request.Title is not null) entity.Title = request.Title.Trim();
        if (request.Description is not null)
            entity.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();

        if (request.ClearDueAt) entity.DueAt = null;
        else if (request.DueAt.HasValue) entity.DueAt = DateTime.SpecifyKind(request.DueAt.Value, DateTimeKind.Utc);

        if (request.ClearDueMileage) entity.DueMileage = null;
        else if (request.DueMileage.HasValue) entity.DueMileage = request.DueMileage.Value;

        if (request.Kind is not null)
            entity.Kind = Enum.Parse<TimelineEventKind>(request.Kind, ignoreCase: true);

        await _db.SaveChangesAsync(ct);

        return await GetDtoAsync(entity.Id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.TimelineEvents.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new KeyNotFoundException($"Timeline event {id} not found.");
        _db.TimelineEvents.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<TimelineEventDto> CompleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.TimelineEvents.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new KeyNotFoundException($"Timeline event {id} not found.");

        if (entity.Status == TimelineEventStatus.Done)
        {
            return await GetDtoAsync(entity.Id, ct);
        }

        entity.Status = TimelineEventStatus.Done;
        await _db.SaveChangesAsync(ct);
        return await GetDtoAsync(entity.Id, ct);
    }

    public async Task<TimelineEventDto> SkipAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.TimelineEvents.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new KeyNotFoundException($"Timeline event {id} not found.");

        if (entity.Status == TimelineEventStatus.Skipped)
        {
            return await GetDtoAsync(entity.Id, ct);
        }

        entity.Status = TimelineEventStatus.Skipped;
        await _db.SaveChangesAsync(ct);
        return await GetDtoAsync(entity.Id, ct);
    }

    public async Task<TimelineEventDto> SnoozeAsync(Guid id, SnoozeTimelineEventRequestDto request, CancellationToken ct = default)
    {
        var entity = await _db.TimelineEvents.FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new KeyNotFoundException($"Timeline event {id} not found.");

        if (entity.Status == TimelineEventStatus.Done || entity.Status == TimelineEventStatus.Skipped)
        {
            throw new InvalidOperationException("A completed or skipped event cannot be snoozed.");
        }

        var current = entity.DueAt ?? DateTime.UtcNow;
        if (current.Kind != DateTimeKind.Utc) current = DateTime.SpecifyKind(current, DateTimeKind.Utc);
        entity.DueAt = current.AddDays(request.Days);
        if (entity.Status == TimelineEventStatus.Triggered)
        {
            entity.Status = TimelineEventStatus.Pending;
        }

        await _db.SaveChangesAsync(ct);
        return await GetDtoAsync(entity.Id, ct);
    }

    public async Task<RegenerateTimelineResponseDto> RegenerateAsync(CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");

        var inserted = await _timelineEngine.RunForOrganizationAsync(orgId, ct);
        return new RegenerateTimelineResponseDto { Inserted = inserted };
    }

    private async Task<TimelineEventDto> GetDtoAsync(Guid id, CancellationToken ct)
    {
        var raw = await _db.TimelineEvents.AsNoTracking()
            .Where(t => t.Id == id)
            .Select(t => new
            {
                t.Id,
                t.VehicleId,
                t.CustomerId,
                t.Kind,
                t.Title,
                t.Description,
                t.DueAt,
                t.DueMileage,
                t.Status,
                t.Source,
                t.GeneratedFromRule,
                t.ItemCode,
                t.Severity,
                t.EstimatedDueAt,
                t.EstimatedKmRemaining,
                t.MileageConfidenceAtGeneration,
                t.CreatedAt,
                t.UpdatedAt,
                Vehicle = _db.Vehicles
                    .Where(v => v.Id == t.VehicleId)
                    .Select(v => new { v.Make, v.Model, v.LicensePlate })
                    .FirstOrDefault(),
                CustomerFullName = _db.Customers
                    .Where(c => c.Id == t.CustomerId)
                    .Select(c => c.FullName)
                    .FirstOrDefault() ?? string.Empty
            })
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException($"Timeline event {id} not found.");

        return new TimelineEventDto
        {
            Id = raw.Id,
            VehicleId = raw.VehicleId,
            CustomerId = raw.CustomerId,
            VehicleLabel = raw.Vehicle is null
                ? string.Empty
                : $"{raw.Vehicle.Make} {raw.Vehicle.Model}".Trim(),
            LicensePlate = raw.Vehicle?.LicensePlate ?? string.Empty,
            CustomerFullName = raw.CustomerFullName,
            Kind = raw.Kind.ToString(),
            Title = raw.Title,
            Description = raw.Description,
            DueAt = raw.DueAt,
            DueMileage = raw.DueMileage,
            Status = raw.Status.ToString(),
            Source = raw.Source.ToString(),
            GeneratedFromRule = raw.GeneratedFromRule,
            ItemCode = raw.ItemCode,
            Severity = raw.Severity?.ToString(),
            EstimatedDueAt = raw.EstimatedDueAt,
            EstimatedKmRemaining = raw.EstimatedKmRemaining,
            MileageConfidenceAtGeneration = raw.MileageConfidenceAtGeneration,
            CreatedAt = raw.CreatedAt,
            UpdatedAt = raw.UpdatedAt
        };
    }
}
