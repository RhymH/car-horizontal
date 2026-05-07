namespace CarHorizontal.Domain.Vehicles;

public sealed record MileageEstimate(
    int EstimatedKm,
    MileageConfidence Confidence,
    int BasedOnReadings,
    double DailyRate,
    DateTime AsOf);
