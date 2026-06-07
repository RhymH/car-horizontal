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
    public string? Error { get; set; }
}
