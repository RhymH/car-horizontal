namespace CarHorizontal.Api.Modules.Leasing.Dtos;

/// <summary>Vue d'un contrat de leasing renvoyée au client (enrichie véhicule/client).</summary>
public class LeasingContractDto
{
    public Guid Id { get; set; }
    public Guid VehicleId { get; set; }
    public string? VehicleLabel { get; set; }
    public string? LicensePlate { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerFullName { get; set; } = string.Empty;

    public string Lessor { get; set; } = string.Empty;
    public string? Reference { get; set; }
    public decimal? MonthlyPayment { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int? MileageCapKm { get; set; }
    public decimal? BuyoutValue { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class LeasingContractListResponseDto
{
    public List<LeasingContractDto> Items { get; set; } = new();
    public int Total { get; set; }
}
