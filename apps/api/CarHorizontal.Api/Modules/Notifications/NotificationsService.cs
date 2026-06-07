using CarHorizontal.Api.Modules.Notifications.Dtos;
using CarHorizontal.Domain.Entities.Notifications;
using CarHorizontal.Domain.Notifications;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Notifications;

public class NotificationsService : INotificationsService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationGenerator _generator;

    public NotificationsService(
        AppDbContext db,
        ICurrentUserService currentUser,
        INotificationGenerator generator)
    {
        _db = db;
        _currentUser = currentUser;
        _generator = generator;
    }

    public async Task<NotificationListResponseDto> ListAsync(
        NotificationListRequestDto request,
        CancellationToken ct = default)
    {
        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize switch { <= 0 => 50, > 200 => 200, _ => request.PageSize };

        var query = _db.Notifications.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Status)
            && Enum.TryParse<NotificationStatus>(request.Status, ignoreCase: true, out var status))
        {
            query = query.Where(n => n.Status == status);
        }
        else
        {
            // Default view = the open inbox.
            query = query.Where(n => n.Status == NotificationStatus.New || n.Status == NotificationStatus.Read);
        }

        if (!string.IsNullOrWhiteSpace(request.Kind)
            && Enum.TryParse<NotificationKind>(request.Kind, ignoreCase: true, out var kind))
        {
            query = query.Where(n => n.Kind == kind);
        }

        var total = await query.CountAsync(ct);

        var rows = await query
            .OrderByDescending(n => n.Severity)
            .ThenBy(n => n.DueAt)
            .ThenByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new
            {
                n.Id,
                n.Kind,
                n.Severity,
                n.Status,
                n.Action,
                n.CustomerId,
                n.VehicleId,
                n.TimelineEventId,
                n.Title,
                n.Message,
                n.DueAt,
                n.CreatedAt,
                n.ReadAt,
                n.ResolvedAt,
                CustomerFullName = _db.Customers
                    .Where(c => c.Id == n.CustomerId).Select(c => c.FullName).FirstOrDefault() ?? string.Empty,
                Vehicle = n.VehicleId == null ? null : _db.Vehicles
                    .Where(v => v.Id == n.VehicleId)
                    .Select(v => new { v.Make, v.Model, v.LicensePlate }).FirstOrDefault()
            })
            .ToListAsync(ct);

        var items = rows.Select(x => new NotificationDto
        {
            Id = x.Id,
            Kind = x.Kind.ToString(),
            Severity = x.Severity.ToString(),
            Status = x.Status.ToString(),
            Action = x.Action.ToString(),
            CustomerId = x.CustomerId,
            CustomerFullName = x.CustomerFullName,
            VehicleId = x.VehicleId,
            VehicleLabel = x.Vehicle is null ? null : $"{x.Vehicle.Make} {x.Vehicle.Model}".Trim(),
            LicensePlate = x.Vehicle?.LicensePlate,
            TimelineEventId = x.TimelineEventId,
            Title = x.Title,
            Message = x.Message,
            DueAt = x.DueAt,
            CreatedAt = x.CreatedAt,
            ReadAt = x.ReadAt,
            ResolvedAt = x.ResolvedAt
        }).ToList();

        return new NotificationListResponseDto
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize,
            UnreadCount = await GetUnreadCountAsync(ct)
        };
    }

    public Task<int> GetUnreadCountAsync(CancellationToken ct = default)
        => _db.Notifications.AsNoTracking().CountAsync(n => n.Status == NotificationStatus.New, ct);

    public async Task<NotificationDto> MarkReadAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await GetTrackedAsync(id, ct);
        if (entity.Status == NotificationStatus.New)
        {
            entity.Status = NotificationStatus.Read;
            entity.ReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        return await ToDtoAsync(entity, ct);
    }

    public async Task<NotificationDto> MarkDoneAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await GetTrackedAsync(id, ct);
        entity.Status = NotificationStatus.Done;
        entity.ReadAt ??= DateTime.UtcNow;
        entity.ResolvedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(entity, ct);
    }

    public async Task<NotificationDto> DismissAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await GetTrackedAsync(id, ct);
        entity.Status = NotificationStatus.Dismissed;
        entity.ReadAt ??= DateTime.UtcNow;
        entity.ResolvedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(entity, ct);
    }

    public Task<int> GenerateForCurrentOrgAsync(CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");
        return _generator.GenerateForOrganizationAsync(orgId, ct);
    }

    private async Task<Notification> GetTrackedAsync(Guid id, CancellationToken ct)
        => await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id, ct)
           ?? throw new KeyNotFoundException($"Notification {id} not found.");

    private async Task<NotificationDto> ToDtoAsync(Notification n, CancellationToken ct)
    {
        var customerName = await _db.Customers
            .Where(c => c.Id == n.CustomerId).Select(c => c.FullName).FirstOrDefaultAsync(ct) ?? string.Empty;

        var vehicle = n.VehicleId == null ? null : await _db.Vehicles
            .Where(v => v.Id == n.VehicleId)
            .Select(v => new { v.Make, v.Model, v.LicensePlate }).FirstOrDefaultAsync(ct);

        return new NotificationDto
        {
            Id = n.Id,
            Kind = n.Kind.ToString(),
            Severity = n.Severity.ToString(),
            Status = n.Status.ToString(),
            Action = n.Action.ToString(),
            CustomerId = n.CustomerId,
            CustomerFullName = customerName,
            VehicleId = n.VehicleId,
            VehicleLabel = vehicle is null ? null : $"{vehicle.Make} {vehicle.Model}".Trim(),
            LicensePlate = vehicle?.LicensePlate,
            TimelineEventId = n.TimelineEventId,
            Title = n.Title,
            Message = n.Message,
            DueAt = n.DueAt,
            CreatedAt = n.CreatedAt,
            ReadAt = n.ReadAt,
            ResolvedAt = n.ResolvedAt
        };
    }
}
