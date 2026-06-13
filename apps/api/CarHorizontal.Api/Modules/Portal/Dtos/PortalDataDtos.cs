namespace CarHorizontal.Api.Modules.Portal.Dtos;

/// <summary>Profil du client connecté (depuis sa fiche Customer).</summary>
public class PortalProfileDto
{
    public Guid CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
}

/// <summary>Échéance à venir d'un véhicule (jalon timeline).</summary>
public class PortalVehicleEventDto
{
    public string Kind { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime? DueAt { get; set; }
    public string? Severity { get; set; }
}

/// <summary>Un véhicule du client + ses prochaines échéances (dashboard).</summary>
public class PortalVehicleDto
{
    public Guid Id { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int? Year { get; set; }
    public string? LicensePlate { get; set; }
    public int CurrentMileage { get; set; }
    public DateTime MileageUpdatedAt { get; set; }
    public List<PortalVehicleEventDto> UpcomingEvents { get; set; } = new();
}
