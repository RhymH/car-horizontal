namespace CarHorizontal.Api.Modules.Vehicles.Dtos;

public class MileageEstimateDto
{
    public int EstimatedKm { get; set; }
    public string Confidence { get; set; } = string.Empty;
    public int BasedOnReadings { get; set; }
    public double DailyRate { get; set; }
    public DateTime AsOf { get; set; }
    public int? LastObservedKm { get; set; }
    public DateTime? LastObservedAt { get; set; }
}
