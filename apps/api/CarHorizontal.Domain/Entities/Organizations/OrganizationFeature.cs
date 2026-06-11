using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Organizations;

/// <summary>
/// Per-organization enablement of a plugin capability (see
/// <see cref="Capabilities.Capabilities"/>). The absence of a row means
/// "use the capability's default"; a row pins it explicitly on or off.
/// Org-scoped so the global multitenant filter applies automatically.
/// </summary>
public class OrganizationFeature : OrganizationEntityBase
{
    /// <summary>Capability key, e.g. "leasing" (matches <c>Capabilities</c> constants).</summary>
    public string Capability { get; set; } = string.Empty;

    public bool Enabled { get; set; }
}
