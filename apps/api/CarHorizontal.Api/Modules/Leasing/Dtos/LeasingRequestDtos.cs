namespace CarHorizontal.Api.Modules.Leasing.Dtos;

/// <summary>Filtres de la liste des contrats.</summary>
public class LeasingContractListRequestDto
{
    public Guid? VehicleId { get; set; }
    public Guid? CustomerId { get; set; }
    public string? Status { get; set; }
}

/// <summary>Création d'un contrat. Le client est déduit du véhicule.</summary>
public class CreateLeasingContractRequestDto
{
    public Guid VehicleId { get; set; }
    public string Lessor { get; set; } = string.Empty;
    public string? Reference { get; set; }
    public decimal? MonthlyPayment { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int? MileageCapKm { get; set; }
    public decimal? BuyoutValue { get; set; }
    public string? Notes { get; set; }
}

/// <summary>Mise à jour partielle : seuls les champs fournis sont appliqués.</summary>
public class UpdateLeasingContractRequestDto
{
    public string? Lessor { get; set; }
    public string? Reference { get; set; }
    public decimal? MonthlyPayment { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? MileageCapKm { get; set; }
    public decimal? BuyoutValue { get; set; }
    /// <summary>Active, Ended ou Cancelled.</summary>
    public string? Status { get; set; }
    public string? Notes { get; set; }
}
