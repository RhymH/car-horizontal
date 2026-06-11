using CarHorizontal.Api.Modules.Capabilities.Dtos;

namespace CarHorizontal.Api.Modules.Capabilities;

/// <summary>
/// Resolves and toggles plugin capabilities for the current organization.
/// Effective state = explicit <c>OrganizationFeature</c> row if present,
/// otherwise the capability's default.
/// </summary>
public interface ICapabilityService
{
    /// <summary>Effective state of every known capability for the current org.</summary>
    Task<IReadOnlyList<CapabilityStatusDto>> GetEffectiveAsync(CancellationToken ct = default);

    /// <summary>True when <paramref name="capabilityKey"/> is enabled for the current org. Used by gating.</summary>
    Task<bool> IsEnabledAsync(string capabilityKey, CancellationToken ct = default);

    /// <summary>Pins a capability on/off for the current org (admin action).</summary>
    Task SetAsync(string capabilityKey, bool enabled, CancellationToken ct = default);
}
