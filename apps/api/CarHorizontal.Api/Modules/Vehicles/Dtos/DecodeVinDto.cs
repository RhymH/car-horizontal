namespace CarHorizontal.Api.Modules.Vehicles.Dtos;

public class DecodeVinRequestDto
{
    public string Vin { get; set; } = string.Empty;
}

public class VinDecodeResponseDto
{
    public string Vin { get; set; } = string.Empty;
    public bool IsValid { get; set; }
    public string? Make { get; set; }
    public string? Country { get; set; }
    public int? ModelYear { get; set; }
    public string? Wmi { get; set; }
    public string? Model { get; set; }
    public string? FuelType { get; set; }
    public string? BodyClass { get; set; }
    public string? VehicleType { get; set; }
    public string? EngineDisplacementL { get; set; }
    public string? EngineCylinders { get; set; }
    public string? TransmissionStyle { get; set; }
    public string? Manufacturer { get; set; }
    public string? PlantCountry { get; set; }
    public string? Series { get; set; }
    public string? Trim { get; set; }
    public string Source { get; set; } = "offline";
    public string? Error { get; set; }
}
