using CarHorizontal.Api.Modules.Portal.Dtos;
using CarHorizontal.Domain.Entities.Timeline;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Portal;

public class PortalService : IPortalService
{
    private const int UpcomingEventsPerVehicle = 3;

    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public PortalService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
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

    private Guid RequireCustomer() =>
        _currentUser.CustomerId ?? throw new UnauthorizedAccessException("Compte client requis.");
}
