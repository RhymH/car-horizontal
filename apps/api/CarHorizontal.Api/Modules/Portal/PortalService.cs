using CarHorizontal.Api.Common;
using CarHorizontal.Api.Modules.Portal.Dtos;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Domain.Entities.Vehicles;
using CarHorizontal.Domain.Vehicles;
using CarHorizontal.Infrastructure.Persistence;
using CarHorizontal.Infrastructure.Timeline;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Portal;

public class PortalService : IPortalService
{
    private const int UpcomingEventsPerVehicle = 3;
    private const int MaxMileage = 1_000_000;

    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IMileageEstimationService _mileageEstimation;
    private readonly ITimelineEngine _timeline;

    public PortalService(
        AppDbContext db,
        ICurrentUserService currentUser,
        IMileageEstimationService mileageEstimation,
        ITimelineEngine timeline)
    {
        _db = db;
        _currentUser = currentUser;
        _mileageEstimation = mileageEstimation;
        _timeline = timeline;
    }

    public async Task<PortalProfileDto> GetProfileAsync(CancellationToken ct = default)
    {
        var customerId = RequireCustomer();

        var c = await _db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == customerId, ct)
            ?? throw new KeyNotFoundException("Fiche client introuvable.");

        return new PortalProfileDto
        {
            CustomerId = c.Id,
            FullName = c.FullName,
            Email = c.Email,
            Phone = c.Phone,
            City = c.City
        };
    }

    public async Task<List<PortalVehicleDto>> GetVehiclesAsync(CancellationToken ct = default)
    {
        var customerId = RequireCustomer();

        // Sécurité : on ne lit que les véhicules DE ce client (jamais un id fourni par l'appelant).
        var vehicles = await _db.Vehicles.AsNoTracking()
            .Where(v => v.CustomerId == customerId)
            .ToListAsync(ct);

        if (vehicles.Count == 0) return new List<PortalVehicleDto>();

        var vehicleIds = vehicles.Select(v => v.Id).ToList();
        var now = DateTime.UtcNow;

        var events = await _db.TimelineEvents.AsNoTracking()
            .Where(t => vehicleIds.Contains(t.VehicleId)
                && (t.Status == TimelineEventStatus.Pending || t.Status == TimelineEventStatus.Triggered)
                && t.DueAt != null
                && t.DueAt >= now)
            .OrderBy(t => t.DueAt)
            .ToListAsync(ct);

        var eventsByVehicle = events
            .GroupBy(e => e.VehicleId)
            .ToDictionary(
                g => g.Key,
                g => g.Take(UpcomingEventsPerVehicle).Select(e => new PortalVehicleEventDto
                {
                    Kind = e.Kind.ToString(),
                    Title = e.Title,
                    DueAt = e.DueAt,
                    Severity = e.Severity?.ToString()
                }).ToList());

        return vehicles.Select(v => new PortalVehicleDto
        {
            Id = v.Id,
            Make = v.Make,
            Model = v.Model,
            Year = v.Year,
            LicensePlate = v.LicensePlate,
            CurrentMileage = v.CurrentMileage,
            MileageUpdatedAt = v.MileageUpdatedAt,
            UpcomingEvents = eventsByVehicle.TryGetValue(v.Id, out var evs) ? evs : new List<PortalVehicleEventDto>()
        }).ToList();
    }

    public async Task SubmitMileageAsync(Guid vehicleId, int mileage, CancellationToken ct = default)
    {
        var customerId = RequireCustomer();

        if (mileage <= 0 || mileage > MaxMileage)
            throw new ConflictException("Le kilométrage saisi est invalide.");

        // Sécurité : le véhicule doit appartenir au client authentifié.
        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(
            v => v.Id == vehicleId && v.CustomerId == customerId, ct)
            ?? throw new KeyNotFoundException("Véhicule introuvable.");

        // Le kilométrage ne recule pas.
        if (mileage < vehicle.CurrentMileage)
            throw new ConflictException(
                $"Le kilométrage doit être supérieur ou égal à {vehicle.CurrentMileage} km (dernière valeur connue).");

        var now = DateTime.UtcNow;
        vehicle.CurrentMileage = mileage;
        vehicle.MileageUpdatedAt = now;

        _db.VehicleMileageReadings.Add(new VehicleMileageReading
        {
            OrganizationId = vehicle.OrganizationId,
            VehicleId = vehicle.Id,
            Mileage = mileage,
            ObservedAt = now,
            Source = MileageReadingSource.CustomerSelfReport,
            RecordedAt = now,
            RecordedBy = _currentUser.UserId
        });

        await _db.SaveChangesAsync(ct);

        // Rafraîchit l'estimation et la timeline (échéances ancrées sur le km).
        _mileageEstimation.InvalidateCache(vehicle.Id);
        await _timeline.RunForVehicleAsync(vehicle.Id, ct);
    }

    private Guid RequireCustomer() =>
        _currentUser.CustomerId ?? throw new UnauthorizedAccessException("Compte client requis.");
}
