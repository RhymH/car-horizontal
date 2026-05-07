namespace CarHorizontal.Api.Modules.MileageCheck.Dtos;

public class MileageCheckContextDto
{
    public string OrganizationName { get; set; } = string.Empty;
    public string VehicleLabel { get; set; } = string.Empty;
    public string LicensePlate { get; set; } = string.Empty;
    public int LastKnownMileage { get; set; }
    public DateTime LastKnownAt { get; set; }
}
