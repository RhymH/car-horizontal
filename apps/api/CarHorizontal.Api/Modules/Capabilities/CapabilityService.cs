using CarHorizontal.Api.Modules.Capabilities.Dtos;
using CarHorizontal.Domain.Entities.Organizations;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
// Alias to avoid collision between this module's namespace (…Modules.Capabilities)
// and the Domain registry class of the same name.
using DomainCapabilities = CarHorizontal.Domain.Capabilities.Capabilities;

namespace CarHorizontal.Api.Modules.Capabilities;

public class CapabilityService : ICapabilityService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CapabilityService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<CapabilityStatusDto>> GetEffectiveAsync(CancellationToken ct = default)
    {
        // Rows are scoped to the current org by the global query filter.
        var rows = await _db.OrganizationFeatures.AsNoTracking().ToListAsync(ct);
        var byKey = rows.ToDictionary(r => r.Capability, r => r.Enabled, StringComparer.OrdinalIgnoreCase);

        return DomainCapabilities.All.Select(c => new CapabilityStatusDto
        {
            Key = c.Key,
            Label = c.Label,
            Description = c.Description,
            Enabled = byKey.TryGetValue(c.Key, out var enabled) ? enabled : c.DefaultEnabled
        }).ToList();
    }

    public async Task<bool> IsEnabledAsync(string capabilityKey, CancellationToken ct = default)
    {
        // Unknown capability is never "enabled" — fail closed.
        var info = DomainCapabilities.Find(capabilityKey);
        if (info is null) return false;

        var row = await _db.OrganizationFeatures.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Capability == info.Key, ct);
        return row?.Enabled ?? info.DefaultEnabled;
    }

    public async Task SetAsync(string capabilityKey, bool enabled, CancellationToken ct = default)
    {
        var info = DomainCapabilities.Find(capabilityKey)
            ?? throw new KeyNotFoundException($"Capability '{capabilityKey}' inconnue.");

        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Organisation active requise.");

        var row = await _db.OrganizationFeatures.FirstOrDefaultAsync(f => f.Capability == info.Key, ct);
        if (row is null)
        {
            // Persist the canonical key casing so lookups stay consistent.
            _db.OrganizationFeatures.Add(new OrganizationFeature
            {
                OrganizationId = orgId,
                Capability = info.Key,
                Enabled = enabled
            });
        }
        else
        {
            row.Enabled = enabled;
        }

        await _db.SaveChangesAsync(ct);
    }
}
