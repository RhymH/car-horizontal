namespace CarHorizontal.Api.Modules.Sales.Dtos;

/// <summary>
/// Contact acheteur vu depuis la fiche client : ici le pivot est le client, donc
/// c'est le véhicule qui est décrit, pas l'acheteur.
/// </summary>
public class CustomerSaleInquiryDto
{
    public Guid Id { get; set; }
    public Guid VehicleId { get; set; }
    public string VehicleLabel { get; set; } = string.Empty;
    public string? LicensePlate { get; set; }

    /// <summary>Prix affiché du véhicule au moment de la lecture.</summary>
    public decimal? AskingPrice { get; set; }

    /// <summary>Statut commercial du véhicule (en vente, réservé, vendu…).</summary>
    public string VehicleSaleStatus { get; set; } = string.Empty;

    public string Channel { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime ReceivedAt { get; set; }
    public decimal? OfferAmount { get; set; }
    public DateTime? TestDriveAt { get; set; }
    public DateTime? NextFollowUpAt { get; set; }
    public string? LostReason { get; set; }
    public string? Notes { get; set; }
}

public class CustomerSaleInquiriesResponseDto
{
    public IReadOnlyList<CustomerSaleInquiryDto> Items { get; set; } = Array.Empty<CustomerSaleInquiryDto>();

    /// <summary>Contacts encore en cours (ni gagnés, ni perdus).</summary>
    public int OpenCount { get; set; }
}
