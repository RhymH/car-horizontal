namespace CarHorizontal.Domain.Vehicles;

public enum MileageReadingSource
{
    Manual = 0,
    MaintenanceRecord = 1,
    CustomerSelfReport = 2,
    TechnicalInspection = 3,
    Estimate = 4,
    VinDecoder = 5
}
