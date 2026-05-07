using System.Text.RegularExpressions;
using CarHorizontal.Api.Common;
using CarHorizontal.Api.Modules.Vehicles.Dtos;
using CarHorizontal.Domain.Entities.Catalog;
using CarHorizontal.Domain.Entities.Customers;
using CarHorizontal.Domain.Entities.Vehicles;
using CarHorizontal.Domain.Vehicles;
using CarHorizontal.Infrastructure.Persistence;
using CarHorizontal.Infrastructure.Timeline;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Vehicles;

public class VehicleService : IVehicleService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly ITimelineEngine _timelineEngine;
    private readonly IMileageEstimationService _mileageEstimation;

    public VehicleService(
        AppDbContext db,
        ICurrentUserService currentUser,
        ITimelineEngine timelineEngine,
        IMileageEstimationService mileageEstimation)
    {
        _db = db;
        _currentUser = currentUser;
        _timelineEngine = timelineEngine;
        _mileageEstimation = mileageEstimation;
    }

    public async Task<VehiclesListResponseDto> ListAsync(VehiclesListRequestDto request, CancellationToken ct = default)
    {
        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize switch
        {
            <= 0 => 25,
            > 100 => 100,
            _ => request.PageSize
        };

        var query = _db.Vehicles.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim();
            var pattern = $"%{s}%";
            var plateRegex = PlateSearch.BuildLikeRegex(s);
            query = query.Where(v =>
                (plateRegex != null && Regex.IsMatch(v.LicensePlate, plateRegex, RegexOptions.IgnoreCase))
                || EF.Functions.ILike(v.Make, pattern)
                || EF.Functions.ILike(v.Model, pattern)
                || (v.Vin != null && EF.Functions.ILike(v.Vin, pattern)));
        }

        if (request.CustomerId.HasValue)
        {
            query = query.Where(v => v.CustomerId == request.CustomerId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.EngineType)
            && Enum.TryParse<EngineType>(request.EngineType, ignoreCase: true, out var engineEnum))
        {
            query = query.Where(v => v.EngineType == engineEnum);
        }

        if (request.YearFrom.HasValue) query = query.Where(v => v.Year >= request.YearFrom.Value);
        if (request.YearTo.HasValue) query = query.Where(v => v.Year <= request.YearTo.Value);

        var total = await query.CountAsync(ct);

        var sortDir = string.Equals(request.SortDir, "desc", StringComparison.OrdinalIgnoreCase) ? "desc" : "asc";
        query = (request.SortBy?.ToLowerInvariant()) switch
        {
            "make" => sortDir == "desc" ? query.OrderByDescending(v => v.Make).ThenBy(v => v.Model) : query.OrderBy(v => v.Make).ThenBy(v => v.Model),
            "year" => sortDir == "desc" ? query.OrderByDescending(v => v.Year) : query.OrderBy(v => v.Year),
            "mileage" => sortDir == "desc" ? query.OrderByDescending(v => v.CurrentMileage) : query.OrderBy(v => v.CurrentMileage),
            "createdat" => sortDir == "desc" ? query.OrderByDescending(v => v.CreatedAt) : query.OrderBy(v => v.CreatedAt),
            _ => sortDir == "desc" ? query.OrderByDescending(v => v.LicensePlate) : query.OrderBy(v => v.LicensePlate)
        };

        var pageItems = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(v => new
            {
                v.Id,
                v.CustomerId,
                CustomerFullName = _db.Customers.Where(c => c.Id == v.CustomerId).Select(c => c.FullName).FirstOrDefault() ?? string.Empty,
                v.Make,
                v.Model,
                v.Year,
                v.LicensePlate,
                v.CurrentMileage,
                v.MileageUpdatedAt,
                v.EngineType,
                v.PhotoFileId
            })
            .ToListAsync(ct);

        return new VehiclesListResponseDto
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Items = pageItems.Select(x => new VehicleListItemDto
            {
                Id = x.Id,
                CustomerId = x.CustomerId,
                CustomerFullName = x.CustomerFullName,
                Make = x.Make,
                Model = x.Model,
                Year = x.Year,
                LicensePlate = x.LicensePlate,
                CurrentMileage = x.CurrentMileage,
                MileageUpdatedAt = x.MileageUpdatedAt,
                EngineType = x.EngineType.ToString(),
                PhotoFileId = x.PhotoFileId
            }).ToList()
        };
    }

    public async Task<VehicleDetailDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var vehicle = await _db.Vehicles
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == id, ct)
            ?? throw new KeyNotFoundException($"Vehicle {id} not found.");

        var customerName = await _db.Customers
            .AsNoTracking()
            .Where(c => c.Id == vehicle.CustomerId)
            .Select(c => c.FullName)
            .FirstOrDefaultAsync(ct) ?? string.Empty;

        string? modelDisplayName = null;
        string? programName = null;
        if (vehicle.VehicleModelId.HasValue)
        {
            modelDisplayName = await _db.VehicleModels
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(m => m.Id == vehicle.VehicleModelId.Value && m.DeletedAt == null)
                .Select(m => $"{m.Make} {m.Model} {m.Trim ?? m.EngineDisplayName}")
                .FirstOrDefaultAsync(ct);
        }
        if (vehicle.SelectedProgramId.HasValue)
        {
            programName = await _db.MaintenancePrograms
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(p => p.Id == vehicle.SelectedProgramId.Value && p.DeletedAt == null)
                .Select(p => p.Name)
                .FirstOrDefaultAsync(ct);
        }

        var maintenance = await _db.MaintenanceRecords
            .AsNoTracking()
            .Where(m => m.VehicleId == id)
            .OrderByDescending(m => m.PerformedAt)
            .Select(m => new VehicleMaintenanceDto
            {
                Id = m.Id,
                PerformedAt = m.PerformedAt,
                Type = m.Type.ToString(),
                Description = m.Description,
                MileageAtService = m.MileageAtService,
                Cost = m.Cost,
                MechanicName = m.MechanicName,
                NextDueAt = m.NextDueAt,
                NextDueMileage = m.NextDueMileage,
                ItemCodes = m.ItemCodes
            })
            .ToListAsync(ct);

        var timeline = await _db.TimelineEvents
            .AsNoTracking()
            .Where(t => t.VehicleId == id)
            .OrderBy(t => t.DueAt ?? DateTime.MaxValue)
            .Select(t => new VehicleTimelineEventDto
            {
                Id = t.Id,
                Kind = t.Kind.ToString(),
                Title = t.Title,
                Description = t.Description,
                DueAt = t.DueAt,
                DueMileage = t.DueMileage,
                Status = t.Status.ToString(),
                Source = t.Source.ToString(),
                GeneratedFromRule = t.GeneratedFromRule
            })
            .ToListAsync(ct);

        return new VehicleDetailDto
        {
            Id = vehicle.Id,
            CustomerId = vehicle.CustomerId,
            CustomerFullName = customerName,
            Make = vehicle.Make,
            Model = vehicle.Model,
            Year = vehicle.Year,
            Vin = vehicle.Vin,
            LicensePlate = vehicle.LicensePlate,
            CurrentMileage = vehicle.CurrentMileage,
            MileageUpdatedAt = vehicle.MileageUpdatedAt,
            EngineType = vehicle.EngineType.ToString(),
            TransmissionType = vehicle.TransmissionType,
            PurchasedAt = vehicle.PurchasedAt,
            Color = vehicle.Color,
            PhotoFileId = vehicle.PhotoFileId,
            VehicleModelId = vehicle.VehicleModelId,
            SelectedProgramId = vehicle.SelectedProgramId,
            VehicleModelDisplayName = modelDisplayName,
            SelectedProgramName = programName,
            CreatedAt = vehicle.CreatedAt,
            UpdatedAt = vehicle.UpdatedAt,
            MaintenanceRecords = maintenance,
            TimelineEvents = timeline
        };
    }

    public async Task<VehicleDetailDto> CreateAsync(CreateVehicleRequestDto request, CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");

        var customerExists = await _db.Customers.AnyAsync(c => c.Id == request.CustomerId, ct);
        if (!customerExists) throw new KeyNotFoundException($"Customer {request.CustomerId} not found.");

        var plate = NormalizePlate(request.LicensePlate);
        await EnsurePlateUniqueAsync(orgId, plate, excludingId: null, ct);

        var vehicle = new Vehicle
        {
            OrganizationId = orgId,
            CustomerId = request.CustomerId,
            Make = request.Make.Trim(),
            Model = request.Model.Trim(),
            Year = request.Year,
            Vin = NormalizeOptional(request.Vin),
            LicensePlate = plate,
            CurrentMileage = request.CurrentMileage,
            MileageUpdatedAt = DateTime.UtcNow,
            EngineType = Enum.Parse<EngineType>(request.EngineType, ignoreCase: true),
            TransmissionType = NormalizeOptional(request.TransmissionType),
            PurchasedAt = request.PurchasedAt,
            Color = NormalizeOptional(request.Color),
            PhotoFileId = request.PhotoFileId
        };

        if (request.VehicleModelId.HasValue)
        {
            await ApplyVehicleModelLinkAsync(vehicle, request.VehicleModelId.Value, request.SelectedProgramId, ct);
        }

        _db.Vehicles.Add(vehicle);

        if (vehicle.CurrentMileage > 0)
        {
            _db.VehicleMileageReadings.Add(new VehicleMileageReading
            {
                OrganizationId = orgId,
                VehicleId = vehicle.Id,
                Mileage = vehicle.CurrentMileage,
                ObservedAt = vehicle.MileageUpdatedAt,
                Source = MileageReadingSource.Manual,
                RecordedAt = DateTime.UtcNow,
                RecordedBy = _currentUser.UserId
            });
        }

        await _db.SaveChangesAsync(ct);
        _mileageEstimation.InvalidateCache(vehicle.Id);

        await _timelineEngine.RunForVehicleAsync(vehicle.Id, ct);

        return await GetAsync(vehicle.Id, ct);
    }

    public async Task<VehicleDetailDto> UpdateAsync(Guid id, UpdateVehicleRequestDto request, CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");

        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == id, ct)
            ?? throw new KeyNotFoundException($"Vehicle {id} not found.");

        if (request.CustomerId.HasValue && request.CustomerId.Value != vehicle.CustomerId)
        {
            var exists = await _db.Customers.AnyAsync(c => c.Id == request.CustomerId.Value, ct);
            if (!exists) throw new KeyNotFoundException($"Customer {request.CustomerId.Value} not found.");
            vehicle.CustomerId = request.CustomerId.Value;
        }

        if (request.Make is not null) vehicle.Make = request.Make.Trim();
        if (request.Model is not null) vehicle.Model = request.Model.Trim();
        if (request.Year.HasValue) vehicle.Year = request.Year.Value;
        if (request.Vin is not null) vehicle.Vin = NormalizeOptional(request.Vin);

        if (request.LicensePlate is not null)
        {
            var plate = NormalizePlate(request.LicensePlate);
            if (!string.Equals(plate, vehicle.LicensePlate, StringComparison.Ordinal))
            {
                await EnsurePlateUniqueAsync(orgId, plate, excludingId: vehicle.Id, ct);
                vehicle.LicensePlate = plate;
            }
        }

        if (request.EngineType is not null)
            vehicle.EngineType = Enum.Parse<EngineType>(request.EngineType, ignoreCase: true);
        if (request.TransmissionType is not null) vehicle.TransmissionType = NormalizeOptional(request.TransmissionType);
        if (request.PurchasedAt.HasValue) vehicle.PurchasedAt = request.PurchasedAt.Value;
        if (request.Color is not null) vehicle.Color = NormalizeOptional(request.Color);
        if (request.PhotoFileId.HasValue) vehicle.PhotoFileId = request.PhotoFileId.Value;

        if (request.ClearVehicleModel)
        {
            vehicle.VehicleModelId = null;
            vehicle.SelectedProgramId = null;
        }
        else if (request.VehicleModelId.HasValue)
        {
            await ApplyVehicleModelLinkAsync(vehicle, request.VehicleModelId.Value, request.SelectedProgramId, ct);
        }
        else if (request.SelectedProgramId.HasValue)
        {
            vehicle.SelectedProgramId = request.SelectedProgramId.Value;
        }

        await _db.SaveChangesAsync(ct);

        await _timelineEngine.RunForVehicleAsync(vehicle.Id, ct);

        return await GetAsync(vehicle.Id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == id, ct)
            ?? throw new KeyNotFoundException($"Vehicle {id} not found.");

        _db.Vehicles.Remove(vehicle);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<VehicleDetailDto> UpdateMileageAsync(Guid id, UpdateMileageRequestDto request, CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Active user is required.");

        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == id, ct)
            ?? throw new KeyNotFoundException($"Vehicle {id} not found.");

        if (request.Mileage < vehicle.CurrentMileage)
        {
            throw new InvalidOperationException(
                $"New mileage ({request.Mileage}) cannot be lower than current mileage ({vehicle.CurrentMileage}).");
        }

        var previous = vehicle.CurrentMileage;
        var observedAt = DateTime.UtcNow;
        vehicle.CurrentMileage = request.Mileage;
        vehicle.MileageUpdatedAt = observedAt;

        var summary = string.IsNullOrWhiteSpace(request.Note)
            ? $"Kilométrage mis à jour : {previous} → {request.Mileage} km"
            : $"Kilométrage mis à jour : {previous} → {request.Mileage} km — {request.Note.Trim()}";

        _db.CustomerInteractions.Add(new CustomerInteraction
        {
            OrganizationId = orgId,
            CustomerId = vehicle.CustomerId,
            Type = CustomerInteractionType.Note,
            OccurredAt = observedAt,
            Summary = summary,
            AuthorUserId = userId
        });

        _db.VehicleMileageReadings.Add(new VehicleMileageReading
        {
            OrganizationId = orgId,
            VehicleId = vehicle.Id,
            Mileage = request.Mileage,
            ObservedAt = observedAt,
            Source = MileageReadingSource.Manual,
            RecordedAt = observedAt,
            RecordedBy = userId,
            Notes = NormalizeOptional(request.Note)
        });

        await _db.SaveChangesAsync(ct);
        _mileageEstimation.InvalidateCache(vehicle.Id);
        return await GetAsync(vehicle.Id, ct);
    }

    public async Task<VehicleDetailDto> SetPhotoAsync(Guid id, Guid photoFileId, CancellationToken ct = default)
    {
        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == id, ct)
            ?? throw new KeyNotFoundException($"Vehicle {id} not found.");

        vehicle.PhotoFileId = photoFileId;
        await _db.SaveChangesAsync(ct);
        return await GetAsync(vehicle.Id, ct);
    }

    public async Task<VehicleProgramProjectionDto?> GetProgramProjectionAsync(Guid vehicleId, CancellationToken ct = default)
    {
        var vehicle = await _db.Vehicles
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == vehicleId, ct)
            ?? throw new KeyNotFoundException($"Vehicle {vehicleId} not found.");

        var dto = new VehicleProgramProjectionDto
        {
            VehicleId = vehicle.Id,
            VehicleModelId = vehicle.VehicleModelId,
            ProgramId = vehicle.SelectedProgramId
        };

        if (!vehicle.VehicleModelId.HasValue) return dto;

        var model = await _db.VehicleModels
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == vehicle.VehicleModelId.Value && m.DeletedAt == null, ct);
        if (model is not null) dto.VehicleModelDisplayName = model.DisplayName;

        MaintenanceProgram? program = null;
        if (vehicle.SelectedProgramId.HasValue)
        {
            program = await _db.MaintenancePrograms
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == vehicle.SelectedProgramId.Value && p.DeletedAt == null, ct);
        }
        program ??= await _db.MaintenancePrograms
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(p => p.Items)
            .Where(p => p.VehicleModelId == vehicle.VehicleModelId.Value && p.DeletedAt == null)
            .OrderByDescending(p => p.IsDefault)
            .ThenBy(p => p.Name)
            .FirstOrDefaultAsync(ct);

        if (program is null) return dto;
        dto.ProgramId = program.Id;
        dto.ProgramName = program.Name;

        var maintenance = await _db.MaintenanceRecords
            .AsNoTracking()
            .Where(m => m.VehicleId == vehicle.Id)
            .OrderByDescending(m => m.PerformedAt)
            .ToListAsync(ct);

        var historyByCode = maintenance
            .Where(m => m.ItemCodes.Length > 0)
            .SelectMany(m => m.ItemCodes.Select(code => (code, record: m)))
            .GroupBy(x => x.code, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(x => x.record.PerformedAt).Select(x => x.record).ToList(),
                StringComparer.OrdinalIgnoreCase);

        var overrides = await _db.VehicleProgramOverrides
            .AsNoTracking()
            .Where(o => o.VehicleId == vehicle.Id)
            .ToListAsync(ct);
        var overrideByCode = overrides.ToDictionary(o => o.ItemCode, StringComparer.OrdinalIgnoreCase);

        var now = DateTime.UtcNow;

        var items = new List<VehicleProgramItemProjectionDto>();
        foreach (var pi in program.Items.OrderBy(i => (int)i.Severity).ThenBy(i => i.IntervalKm ?? int.MaxValue))
        {
            overrideByCode.TryGetValue(pi.Code, out var ov);
            var disabled = ov?.Disabled ?? false;

            var intervalMonths = ov?.OverrideIntervalMonths ?? pi.IntervalMonths;
            var intervalKm = ov?.OverrideIntervalKm ?? pi.IntervalKm;

            historyByCode.TryGetValue(pi.Code, out var history);
            var lastDone = history?.FirstOrDefault();

            DateTime? nextDueAt = null;
            int? nextDueKm = null;

            if (!disabled)
            {
                if (lastDone is null)
                {
                    var anchorDate = vehicle.PurchasedAt ?? vehicle.CreatedAt;
                    var firstMonths = pi.FirstOccurrenceMonths ?? intervalMonths;
                    var firstKm = pi.FirstOccurrenceKm ?? intervalKm;
                    if (firstMonths is not null) nextDueAt = anchorDate.AddMonths(firstMonths.Value);
                    if (firstKm is not null) nextDueKm = firstKm.Value;
                }
                else
                {
                    if (intervalMonths is not null) nextDueAt = lastDone.PerformedAt.AddMonths(intervalMonths.Value);
                    if (intervalKm is not null) nextDueKm = lastDone.MileageAtService + intervalKm.Value;
                }

                if (pi.Trigger == Domain.Entities.Catalog.MaintenanceItemTrigger.TimeOnly) nextDueKm = null;
                if (pi.Trigger == Domain.Entities.Catalog.MaintenanceItemTrigger.KmOnly) nextDueAt = null;
            }

            int? kmRemaining = nextDueKm.HasValue ? nextDueKm.Value - vehicle.CurrentMileage : null;
            int? daysRemaining = nextDueAt.HasValue ? (int)Math.Round((nextDueAt.Value - now).TotalDays) : null;

            var status = ComputeStatus(disabled, lastDone is not null, kmRemaining, daysRemaining);

            items.Add(new VehicleProgramItemProjectionDto
            {
                Code = pi.Code,
                Title = pi.Title,
                Severity = pi.Severity.ToString(),
                LastDoneAt = lastDone?.PerformedAt,
                LastDoneKm = lastDone?.MileageAtService,
                NextDueAt = nextDueAt,
                NextDueKm = nextDueKm,
                Status = status,
                KmRemaining = kmRemaining,
                DaysRemaining = daysRemaining,
                EstimatedCostMin = pi.EstimatedCostMin,
                EstimatedCostMax = pi.EstimatedCostMax,
                HasOverride = ov is not null,
                Disabled = disabled
            });
        }

        dto.Items = items;
        return dto;
    }

    private static string ComputeStatus(bool disabled, bool everDone, int? kmRemaining, int? daysRemaining)
    {
        if (disabled) return "Disabled";
        if (kmRemaining is < 0 || daysRemaining is < 0) return "Overdue";
        if (kmRemaining is <= 1500 || daysRemaining is <= 30) return "UpcomingSoon";
        if (kmRemaining is <= 5000 || daysRemaining is <= 90) return "Upcoming";
        return everDone ? "Future" : "Future";
    }

    private async Task ApplyVehicleModelLinkAsync(Vehicle vehicle, Guid modelId, Guid? selectedProgramId, CancellationToken ct)
    {
        var model = await _db.VehicleModels
            .IgnoreQueryFilters()
            .Where(m => m.Id == modelId && m.DeletedAt == null)
            .Include(m => m.Programs.Where(p => p.DeletedAt == null))
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException($"Vehicle model {modelId} not found.");

        vehicle.VehicleModelId = model.Id;

        // Denormalise text fields from catalog so legacy lookups still work.
        vehicle.Make = model.Make;
        vehicle.Model = model.Model;
        if (vehicle.Year == 0) vehicle.Year = model.ProductionStartYear;
        vehicle.EngineType = model.EngineType;

        if (selectedProgramId.HasValue
            && model.Programs.Any(p => p.Id == selectedProgramId.Value))
        {
            vehicle.SelectedProgramId = selectedProgramId.Value;
        }
        else
        {
            var defaultProgram = model.Programs
                .OrderByDescending(p => p.IsDefault)
                .ThenBy(p => p.Name)
                .FirstOrDefault();
            vehicle.SelectedProgramId = defaultProgram?.Id;
        }
    }

    private async Task EnsurePlateUniqueAsync(Guid orgId, string plate, Guid? excludingId, CancellationToken ct)
    {
        var query = _db.Vehicles.IgnoreQueryFilters()
            .Where(v => v.OrganizationId == orgId && v.DeletedAt == null && v.LicensePlate == plate);
        if (excludingId.HasValue) query = query.Where(v => v.Id != excludingId.Value);

        if (await query.AnyAsync(ct))
        {
            throw new InvalidOperationException($"License plate '{plate}' is already in use in this organization.");
        }
    }

    private static string NormalizePlate(string raw) => raw.Trim().ToUpperInvariant();

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }
}
