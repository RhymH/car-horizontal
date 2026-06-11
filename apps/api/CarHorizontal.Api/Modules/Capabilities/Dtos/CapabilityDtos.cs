namespace CarHorizontal.Api.Modules.Capabilities.Dtos;

/// <summary>Effective state of a plugin capability for the current organization.</summary>
public class CapabilityStatusDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}

/// <summary>Body of the admin toggle: enable or disable a capability for the org.</summary>
public class SetCapabilityRequestDto
{
    public bool Enabled { get; set; }
}
