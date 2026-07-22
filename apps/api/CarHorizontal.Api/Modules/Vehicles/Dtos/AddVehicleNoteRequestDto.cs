namespace CarHorizontal.Api.Modules.Vehicles.Dtos;

public class AddVehicleNoteRequestDto
{
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public string Body { get; set; } = string.Empty;
}
