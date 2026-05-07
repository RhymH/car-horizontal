using CarHorizontal.Api.Modules.Appointments.Dtos;
using CarHorizontal.Domain.Entities.Appointments;
using CarHorizontal.Domain.Entities.Messaging;
using CarHorizontal.Domain.Entities.Reminders;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Appointments;

public class AppointmentsService : IAppointmentsService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public AppointmentsService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<AppointmentListResponseDto> ListAsync(AppointmentListRequestDto request, CancellationToken ct = default)
    {
        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize switch
        {
            <= 0 => 100,
            > 500 => 500,
            _ => request.PageSize
        };

        var query = _db.Appointments.AsNoTracking().AsQueryable();

        if (request.From.HasValue)
        {
            var from = DateTime.SpecifyKind(request.From.Value, DateTimeKind.Utc);
            query = query.Where(a => a.ScheduledAt >= from);
        }
        if (request.To.HasValue)
        {
            var to = DateTime.SpecifyKind(request.To.Value, DateTimeKind.Utc);
            query = query.Where(a => a.ScheduledAt <= to);
        }
        if (request.CustomerId.HasValue) query = query.Where(a => a.CustomerId == request.CustomerId.Value);
        if (request.VehicleId.HasValue) query = query.Where(a => a.VehicleId == request.VehicleId.Value);
        if (!string.IsNullOrWhiteSpace(request.Status)
            && Enum.TryParse<AppointmentStatus>(request.Status, ignoreCase: true, out var statusEnum))
        {
            query = query.Where(a => a.Status == statusEnum);
        }

        var total = await query.CountAsync(ct);

        var sortDir = string.Equals(request.SortDir, "desc", StringComparison.OrdinalIgnoreCase) ? "desc" : "asc";
        query = sortDir == "desc"
            ? query.OrderByDescending(a => a.ScheduledAt).ThenByDescending(a => a.CreatedAt)
            : query.OrderBy(a => a.ScheduledAt).ThenBy(a => a.CreatedAt);

        var raw = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                a.Id,
                a.CustomerId,
                a.VehicleId,
                a.ScheduledAt,
                a.DurationMinutes,
                a.Subject,
                a.Notes,
                a.Status,
                a.CreatedFromReminderId,
                a.CreatedAt,
                a.UpdatedAt,
                CustomerFullName = _db.Customers.Where(c => c.Id == a.CustomerId).Select(c => c.FullName).FirstOrDefault() ?? string.Empty,
                CustomerEmail = _db.Customers.Where(c => c.Id == a.CustomerId).Select(c => c.Email).FirstOrDefault(),
                CustomerPhone = _db.Customers.Where(c => c.Id == a.CustomerId).Select(c => c.Phone).FirstOrDefault(),
                Vehicle = a.VehicleId == null ? null : _db.Vehicles
                    .Where(v => v.Id == a.VehicleId)
                    .Select(v => new { v.Make, v.Model, v.LicensePlate })
                    .FirstOrDefault()
            })
            .ToListAsync(ct);

        var items = raw.Select(x => new AppointmentDto
        {
            Id = x.Id,
            CustomerId = x.CustomerId,
            CustomerFullName = x.CustomerFullName,
            CustomerEmail = x.CustomerEmail,
            CustomerPhone = x.CustomerPhone,
            VehicleId = x.VehicleId,
            VehicleLabel = x.Vehicle is null ? null : $"{x.Vehicle.Make} {x.Vehicle.Model}".Trim(),
            LicensePlate = x.Vehicle?.LicensePlate,
            ScheduledAt = x.ScheduledAt,
            DurationMinutes = x.DurationMinutes,
            Subject = x.Subject,
            Notes = x.Notes,
            Status = x.Status.ToString(),
            CreatedFromReminderId = x.CreatedFromReminderId,
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt
        }).ToList();

        return new AppointmentListResponseDto
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Items = items
        };
    }

    public Task<AppointmentDto> GetAsync(Guid id, CancellationToken ct = default) => GetDtoAsync(id, ct);

    public async Task<AppointmentDto> CreateAsync(CreateAppointmentRequestDto request, CancellationToken ct = default)
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
                throw new InvalidOperationException("Vehicle does not belong to the specified customer.");
            vehicleId = vehicle.Id;
        }

        var scheduledAt = DateTime.SpecifyKind(request.ScheduledAt, DateTimeKind.Utc);

        var entity = new Appointment
        {
            OrganizationId = orgId,
            CustomerId = customer.Id,
            VehicleId = vehicleId,
            ScheduledAt = scheduledAt,
            DurationMinutes = request.DurationMinutes,
            Subject = request.Subject.Trim(),
            Notes = NormalizeOptional(request.Notes),
            Status = AppointmentStatus.Pending
        };

        _db.Appointments.Add(entity);
        await _db.SaveChangesAsync(ct);

        await TryCreateConfirmationReminderAsync(entity, customer.Email, customer.Phone, ct);

        return await GetDtoAsync(entity.Id, ct);
    }

    public async Task<AppointmentDto> UpdateAsync(Guid id, UpdateAppointmentRequestDto request, CancellationToken ct = default)
    {
        var entity = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new KeyNotFoundException($"Appointment {id} not found.");

        if (entity.Status is AppointmentStatus.Cancelled or AppointmentStatus.Done)
            throw new InvalidOperationException("Cannot edit a cancelled or completed appointment.");

        if (request.ScheduledAt.HasValue)
            entity.ScheduledAt = DateTime.SpecifyKind(request.ScheduledAt.Value, DateTimeKind.Utc);
        if (request.DurationMinutes.HasValue) entity.DurationMinutes = request.DurationMinutes.Value;
        if (request.Subject is not null) entity.Subject = request.Subject.Trim();
        if (request.Notes is not null) entity.Notes = NormalizeOptional(request.Notes);

        if (request.ClearVehicle)
        {
            entity.VehicleId = null;
        }
        else if (request.VehicleId.HasValue)
        {
            var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == request.VehicleId.Value, ct)
                ?? throw new KeyNotFoundException($"Vehicle {request.VehicleId} not found.");
            if (vehicle.CustomerId != entity.CustomerId)
                throw new InvalidOperationException("Vehicle does not belong to the appointment's customer.");
            entity.VehicleId = vehicle.Id;
        }

        if (!string.IsNullOrWhiteSpace(request.Status)
            && Enum.TryParse<AppointmentStatus>(request.Status, ignoreCase: true, out var newStatus))
        {
            entity.Status = newStatus;
        }

        await _db.SaveChangesAsync(ct);
        return await GetDtoAsync(entity.Id, ct);
    }

    public Task<AppointmentDto> ConfirmAsync(Guid id, CancellationToken ct = default) =>
        TransitionAsync(id, AppointmentStatus.Confirmed,
            allowFrom: new[] { AppointmentStatus.Pending, AppointmentStatus.Confirmed }, ct);

    public Task<AppointmentDto> CancelAsync(Guid id, CancellationToken ct = default) =>
        TransitionAsync(id, AppointmentStatus.Cancelled,
            allowFrom: new[] { AppointmentStatus.Pending, AppointmentStatus.Confirmed }, ct,
            onTransition: async entity =>
            {
                var subject = $"Confirmation rendez-vous : {entity.Subject}";
                var pending = await _db.Reminders
                    .Where(r => r.CustomerId == entity.CustomerId
                        && r.ScheduledAt > DateTime.UtcNow
                        && r.ResolvedSubject == subject
                        && (r.Status == ReminderStatus.Scheduled || r.Status == ReminderStatus.Snoozed))
                    .ToListAsync(ct);
                foreach (var r in pending) r.Status = ReminderStatus.Cancelled;
            });

    public Task<AppointmentDto> MarkDoneAsync(Guid id, CancellationToken ct = default) =>
        TransitionAsync(id, AppointmentStatus.Done,
            allowFrom: new[] { AppointmentStatus.Pending, AppointmentStatus.Confirmed }, ct);

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new KeyNotFoundException($"Appointment {id} not found.");
        _db.Appointments.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    private async Task<AppointmentDto> TransitionAsync(
        Guid id,
        AppointmentStatus target,
        IEnumerable<AppointmentStatus> allowFrom,
        CancellationToken ct,
        Func<Appointment, Task>? onTransition = null)
    {
        var entity = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new KeyNotFoundException($"Appointment {id} not found.");

        if (!allowFrom.Contains(entity.Status))
            throw new InvalidOperationException($"Cannot transition appointment from {entity.Status} to {target}.");

        entity.Status = target;
        if (onTransition is not null) await onTransition(entity);

        await _db.SaveChangesAsync(ct);
        return await GetDtoAsync(entity.Id, ct);
    }

    private async Task TryCreateConfirmationReminderAsync(
        Appointment appointment,
        string? customerEmail,
        string? customerPhone,
        CancellationToken ct)
    {
        var hasEmail = !string.IsNullOrWhiteSpace(customerEmail);
        var hasPhone = !string.IsNullOrWhiteSpace(customerPhone);
        if (!hasEmail && !hasPhone) return;

        var reminderAt = appointment.ScheduledAt.AddDays(-1);
        if (reminderAt <= DateTime.UtcNow) return;

        var channel = hasEmail && hasPhone
            ? MessageChannel.Both
            : hasEmail ? MessageChannel.Email : MessageChannel.Sms;

        var localTime = appointment.ScheduledAt.ToLocalTime();
        var subject = $"Confirmation rendez-vous : {appointment.Subject}";
        var body = $"Bonjour, nous vous rappelons votre rendez-vous prévu le {localTime:dd/MM/yyyy} à {localTime:HH:mm}. Sujet : {appointment.Subject}.";

        var reminder = new Reminder
        {
            OrganizationId = appointment.OrganizationId,
            CustomerId = appointment.CustomerId,
            VehicleId = appointment.VehicleId,
            Channel = channel,
            ScheduledAt = reminderAt,
            Status = ReminderStatus.Scheduled,
            ResolvedSubject = subject,
            ResolvedBody = body
        };
        _db.Reminders.Add(reminder);
        await _db.SaveChangesAsync(ct);
    }

    private async Task<AppointmentDto> GetDtoAsync(Guid id, CancellationToken ct)
    {
        var x = await _db.Appointments.AsNoTracking()
            .Where(a => a.Id == id)
            .Select(a => new
            {
                a.Id,
                a.CustomerId,
                a.VehicleId,
                a.ScheduledAt,
                a.DurationMinutes,
                a.Subject,
                a.Notes,
                a.Status,
                a.CreatedFromReminderId,
                a.CreatedAt,
                a.UpdatedAt,
                CustomerFullName = _db.Customers.Where(c => c.Id == a.CustomerId).Select(c => c.FullName).FirstOrDefault() ?? string.Empty,
                CustomerEmail = _db.Customers.Where(c => c.Id == a.CustomerId).Select(c => c.Email).FirstOrDefault(),
                CustomerPhone = _db.Customers.Where(c => c.Id == a.CustomerId).Select(c => c.Phone).FirstOrDefault(),
                Vehicle = a.VehicleId == null ? null : _db.Vehicles
                    .Where(v => v.Id == a.VehicleId)
                    .Select(v => new { v.Make, v.Model, v.LicensePlate })
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException($"Appointment {id} not found.");

        return new AppointmentDto
        {
            Id = x.Id,
            CustomerId = x.CustomerId,
            CustomerFullName = x.CustomerFullName,
            CustomerEmail = x.CustomerEmail,
            CustomerPhone = x.CustomerPhone,
            VehicleId = x.VehicleId,
            VehicleLabel = x.Vehicle is null ? null : $"{x.Vehicle.Make} {x.Vehicle.Model}".Trim(),
            LicensePlate = x.Vehicle?.LicensePlate,
            ScheduledAt = x.ScheduledAt,
            DurationMinutes = x.DurationMinutes,
            Subject = x.Subject,
            Notes = x.Notes,
            Status = x.Status.ToString(),
            CreatedFromReminderId = x.CreatedFromReminderId,
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt
        };
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }
}
