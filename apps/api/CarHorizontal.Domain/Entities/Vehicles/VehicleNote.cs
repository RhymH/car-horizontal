using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Vehicles;

/// <summary>
/// Note libre attachée à un véhicule (observation atelier, remarque client, etc.).
/// Journal en ajout seul, à l'image des interactions client mais sans typage.
/// </summary>
public class VehicleNote : OrganizationEntityBase
{
    public Guid VehicleId { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public string Body { get; set; } = string.Empty;
    public Guid AuthorUserId { get; set; }
}
