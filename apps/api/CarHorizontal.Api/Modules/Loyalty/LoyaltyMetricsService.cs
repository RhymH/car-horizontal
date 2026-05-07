using System.Globalization;
using CarHorizontal.Api.Modules.Loyalty.Dtos;
using CarHorizontal.Domain.Entities.Customers;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace CarHorizontal.Api.Modules.Loyalty;

public class LoyaltyMetricsService : ILoyaltyMetricsService
{
    private const int AtRiskMinDays = 365;
    private const int AtRiskMaxDays = 540;
    private const int LostThresholdDays = 540;
    private const int RetentionWindowDays = 365;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(30);
    private static readonly CultureInfo FrenchCulture = new("fr-FR");

    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IMemoryCache _cache;

    public LoyaltyMetricsService(AppDbContext db, ICurrentUserService currentUser, IMemoryCache cache)
    {
        _db = db;
        _currentUser = currentUser;
        _cache = cache;
    }

    public async Task<LoyaltyOverviewResponseDto> GetOverviewAsync(CancellationToken ct = default)
    {
        var orgId = RequireOrganizationId();
        return await _cache.GetOrCreateAsync(CacheKey("overview", orgId), async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheTtl;
            return await ComputeOverviewAsync(ct);
        }) ?? new LoyaltyOverviewResponseDto();
    }

    public async Task<LoyaltyCohortsResponseDto> GetCohortsAsync(CancellationToken ct = default)
    {
        var orgId = RequireOrganizationId();
        return await _cache.GetOrCreateAsync(CacheKey("cohorts", orgId), async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheTtl;
            return await ComputeCohortsAsync(ct);
        }) ?? new LoyaltyCohortsResponseDto();
    }

    public async Task<LoyaltyCustomerListResponseDto> GetAtRiskCustomersAsync(int? limit, CancellationToken ct = default)
    {
        RequireOrganizationId();
        var now = DateTime.UtcNow;
        var minLast = now.AddDays(-AtRiskMaxDays);
        var maxLast = now.AddDays(-AtRiskMinDays);
        var rows = await BuildCustomerLastContactQueryAsync(ct);
        var filtered = rows
            .Where(r => r.LastContactAt.HasValue && r.LastContactAt >= minLast && r.LastContactAt < maxLast)
            .OrderBy(r => r.LastContactAt)
            .ToList();
        return MaterializeList(filtered, limit, now);
    }

    public async Task<LoyaltyCustomerListResponseDto> GetLostCustomersAsync(int? limit, CancellationToken ct = default)
    {
        RequireOrganizationId();
        var now = DateTime.UtcNow;
        var threshold = now.AddDays(-LostThresholdDays);
        var rows = await BuildCustomerLastContactQueryAsync(ct);
        var filtered = rows
            .Where(r => r.LastContactAt.HasValue && r.LastContactAt < threshold)
            .OrderBy(r => r.LastContactAt)
            .ToList();
        return MaterializeList(filtered, limit, now);
    }

    public async Task<List<LoyaltyTrendPointDto>> GetRetentionTrendAsync(CancellationToken ct = default)
    {
        var orgId = RequireOrganizationId();
        return await _cache.GetOrCreateAsync(CacheKey("trend", orgId), async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheTtl;
            return await ComputeRetentionTrendAsync(ct);
        }) ?? new List<LoyaltyTrendPointDto>();
    }

    public Task RecomputeForCurrentOrgAsync(CancellationToken ct = default)
    {
        var orgId = RequireOrganizationId();
        _cache.Remove(CacheKey("overview", orgId));
        _cache.Remove(CacheKey("cohorts", orgId));
        _cache.Remove(CacheKey("trend", orgId));
        return Task.CompletedTask;
    }

    private Guid RequireOrganizationId()
    {
        return _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");
    }

    private static string CacheKey(string scope, Guid orgId) => $"loyalty:{scope}:{orgId:N}";

    private async Task<LoyaltyOverviewResponseDto> ComputeOverviewAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var rows = await BuildCustomerLastContactQueryAsync(ct);

        var existing12mAgo = rows.Where(r => r.AcquiredAt <= now.AddDays(-RetentionWindowDays)).ToList();
        var returned = existing12mAgo
            .Count(r => r.LastContactAt.HasValue && r.LastContactAt >= now.AddDays(-RetentionWindowDays));
        var retentionPct = existing12mAgo.Count == 0
            ? 0
            : Math.Round(100.0 * returned / existing12mAgo.Count, 1);

        var lostThreshold = now.AddDays(-LostThresholdDays);
        var lost = rows.Count(r => r.LastContactAt.HasValue && r.LastContactAt < lostThreshold);

        var atRiskMin = now.AddDays(-AtRiskMaxDays);
        var atRiskMax = now.AddDays(-AtRiskMinDays);
        var atRisk = rows.Count(r => r.LastContactAt.HasValue
            && r.LastContactAt >= atRiskMin
            && r.LastContactAt < atRiskMax);

        var avgInterval = await ComputeAverageReturnIntervalDaysAsync(ct);
        var trend = await ComputeRetentionTrendAsync(ct);

        return new LoyaltyOverviewResponseDto
        {
            Kpis = new LoyaltyKpisDto
            {
                Retention12mPct = retentionPct,
                ReturnedLast12Months = returned,
                LostCustomers = lost,
                AverageReturnIntervalDays = Math.Round(avgInterval, 1),
                AtRiskCount = atRisk
            },
            RetentionTrend = trend
        };
    }

    private async Task<double> ComputeAverageReturnIntervalDaysAsync(CancellationToken ct)
    {
        var contacts = await GetAllContactsAsync(ct);
        var grouped = contacts.GroupBy(c => c.CustomerId);
        var intervals = new List<double>();
        foreach (var g in grouped)
        {
            var ordered = g.OrderBy(x => x.OccurredAt).Select(x => x.OccurredAt).ToList();
            if (ordered.Count < 2) continue;
            for (var i = 1; i < ordered.Count; i++)
            {
                intervals.Add((ordered[i] - ordered[i - 1]).TotalDays);
            }
        }
        return intervals.Count == 0 ? 0 : intervals.Average();
    }

    private async Task<List<LoyaltyTrendPointDto>> ComputeRetentionTrendAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var contacts = await GetAllContactsAsync(ct);
        var customers = await _db.Customers.AsNoTracking()
            .Select(c => new { c.Id, c.AcquiredAt })
            .ToListAsync(ct);

        var byCustomer = contacts.GroupBy(c => c.CustomerId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.OccurredAt).OrderBy(x => x).ToList());

        var startMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11);
        var trend = new List<LoyaltyTrendPointDto>(12);
        for (var i = 0; i < 12; i++)
        {
            var anchor = startMonth.AddMonths(i + 1);
            var windowStart = anchor.AddDays(-RetentionWindowDays);
            var existing = customers.Where(c => c.AcquiredAt <= windowStart).ToList();
            var active = existing.Count(c =>
                byCustomer.TryGetValue(c.Id, out var ts) && ts.Any(t => t >= windowStart && t < anchor));
            var pct = existing.Count == 0 ? 0 : Math.Round(100.0 * active / existing.Count, 1);

            var label = startMonth.AddMonths(i).ToString("MMM yy", FrenchCulture);
            trend.Add(new LoyaltyTrendPointDto
            {
                Date = DateTime.SpecifyKind(startMonth.AddMonths(i), DateTimeKind.Utc),
                Label = label,
                Value = pct
            });
        }
        return trend;
    }

    private async Task<LoyaltyCohortsResponseDto> ComputeCohortsAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var startMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11);

        var customers = await _db.Customers.AsNoTracking()
            .Where(c => c.AcquiredAt >= startMonth)
            .Select(c => new { c.Id, c.AcquiredAt })
            .ToListAsync(ct);

        var contacts = await GetAllContactsAsync(ct);
        var byCustomer = contacts.GroupBy(c => c.CustomerId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.OccurredAt).ToList());

        var cohorts = new List<LoyaltyCohortRowDto>(12);
        var maxOffset = 0;
        for (var i = 0; i < 12; i++)
        {
            var cohortMonth = startMonth.AddMonths(i);
            var cohortNext = cohortMonth.AddMonths(1);
            var cohortCustomers = customers
                .Where(c => c.AcquiredAt >= cohortMonth && c.AcquiredAt < cohortNext)
                .ToList();

            var row = new LoyaltyCohortRowDto
            {
                CohortMonth = DateTime.SpecifyKind(cohortMonth, DateTimeKind.Utc),
                CohortLabel = cohortMonth.ToString("MMM yy", FrenchCulture),
                CohortSize = cohortCustomers.Count
            };

            var availableOffsets = (int)((now - cohortMonth).TotalDays / 30);
            availableOffsets = Math.Min(availableOffsets, 11);
            for (var off = 1; off <= availableOffsets; off++)
            {
                var monthStart = cohortMonth.AddMonths(off);
                var monthEnd = monthStart.AddMonths(1);
                var returned = cohortCustomers.Count(c =>
                    byCustomer.TryGetValue(c.Id, out var ts) && ts.Any(t => t >= monthStart && t < monthEnd));
                var pct = cohortCustomers.Count == 0 ? 0 : Math.Round(100.0 * returned / cohortCustomers.Count, 1);
                row.Cells.Add(new LoyaltyCohortCellDto
                {
                    OffsetMonths = off,
                    Returned = returned,
                    RetentionPct = pct
                });
                if (off > maxOffset) maxOffset = off;
            }
            cohorts.Add(row);
        }

        return new LoyaltyCohortsResponseDto
        {
            Cohorts = cohorts,
            MaxOffsetMonths = maxOffset
        };
    }

    private record CustomerRow(
        Guid Id,
        string FullName,
        string? Email,
        string? Phone,
        string? City,
        DateTime AcquiredAt,
        CustomerStatus Status,
        int VehicleCount,
        DateTime? LastContactAt);

    private record ContactRow(Guid CustomerId, DateTime OccurredAt);

    private async Task<List<CustomerRow>> BuildCustomerLastContactQueryAsync(CancellationToken ct)
    {
        var customers = await _db.Customers.AsNoTracking()
            .Select(c => new
            {
                c.Id,
                c.FullName,
                c.Email,
                c.Phone,
                c.City,
                c.AcquiredAt,
                c.Status,
                VehicleCount = _db.Vehicles.Count(v => v.CustomerId == c.Id),
                LastInteractionAt = _db.CustomerInteractions
                    .Where(i => i.CustomerId == c.Id)
                    .Max(i => (DateTime?)i.OccurredAt),
                LastMaintenanceAt = _db.MaintenanceRecords
                    .Where(m => _db.Vehicles.Any(v => v.Id == m.VehicleId && v.CustomerId == c.Id))
                    .Max(m => (DateTime?)m.PerformedAt)
            })
            .ToListAsync(ct);

        return customers
            .Select(c => new CustomerRow(
                c.Id, c.FullName, c.Email, c.Phone, c.City, c.AcquiredAt, c.Status, c.VehicleCount,
                MaxNullable(c.LastInteractionAt, c.LastMaintenanceAt)))
            .ToList();
    }

    private async Task<List<ContactRow>> GetAllContactsAsync(CancellationToken ct)
    {
        var interactions = await _db.CustomerInteractions.AsNoTracking()
            .Select(i => new { i.CustomerId, i.OccurredAt })
            .ToListAsync(ct);
        var maintenance = await _db.MaintenanceRecords.AsNoTracking()
            .Select(m => new
            {
                CustomerId = _db.Vehicles
                    .Where(v => v.Id == m.VehicleId)
                    .Select(v => v.CustomerId)
                    .FirstOrDefault(),
                m.PerformedAt
            })
            .Where(m => m.CustomerId != Guid.Empty)
            .ToListAsync(ct);

        var list = new List<ContactRow>(interactions.Count + maintenance.Count);
        foreach (var i in interactions) list.Add(new ContactRow(i.CustomerId, i.OccurredAt));
        foreach (var m in maintenance) list.Add(new ContactRow(m.CustomerId, m.PerformedAt));
        return list;
    }

    private static DateTime? MaxNullable(DateTime? a, DateTime? b)
    {
        if (a is null) return b;
        if (b is null) return a;
        return a > b ? a : b;
    }

    private static LoyaltyCustomerListResponseDto MaterializeList(IEnumerable<CustomerRow> rows, int? limit, DateTime now)
    {
        var ordered = rows.ToList();
        var total = ordered.Count;
        var taken = limit.HasValue && limit.Value > 0 ? ordered.Take(limit.Value) : ordered;
        var items = taken.Select(r => new LoyaltyCustomerDto
        {
            Id = r.Id,
            FullName = r.FullName,
            Email = r.Email,
            Phone = r.Phone,
            City = r.City,
            LastContactAt = r.LastContactAt,
            DaysSinceLastContact = r.LastContactAt.HasValue
                ? (int)Math.Floor((now - r.LastContactAt.Value).TotalDays)
                : null,
            VehicleCount = r.VehicleCount
        }).ToList();
        return new LoyaltyCustomerListResponseDto { Items = items, Total = total };
    }
}
