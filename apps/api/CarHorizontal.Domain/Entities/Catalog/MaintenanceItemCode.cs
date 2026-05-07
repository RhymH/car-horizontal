namespace CarHorizontal.Domain.Entities.Catalog;

public static class MaintenanceItemCode
{
    public const string OilChange = "oil_change";
    public const string OilFilter = "oil_filter";
    public const string CabinFilter = "cabin_filter";
    public const string AirFilter = "air_filter";
    public const string FuelFilter = "fuel_filter";
    public const string BrakeFluid = "brake_fluid";
    public const string BrakePadsFront = "brake_pads_front";
    public const string BrakePadsRear = "brake_pads_rear";
    public const string BrakeDiscsFront = "brake_discs_front";
    public const string BrakeDiscsRear = "brake_discs_rear";
    public const string TimingBelt = "timing_belt";
    public const string AccessoryBelt = "accessory_belt";
    public const string Coolant = "coolant";
    public const string SparkPlugs = "spark_plugs";
    public const string GlowPlugs = "glow_plugs";
    public const string TransmissionFluid = "transmission_fluid";
    public const string DifferentialFluid = "differential_fluid";
    public const string TireRotation = "tire_rotation";
    public const string TireReplacement = "tire_replacement";
    public const string Wipers = "wipers";
    public const string BatteryCheck = "battery_check";
    public const string AcService = "ac_service";
    public const string PowerSteeringFluid = "power_steering_fluid";
    public const string DpfRegen = "dpf_regen";
    public const string TechnicalInspection = "technical_inspection";

    public static readonly IReadOnlyList<string> All = new[]
    {
        OilChange, OilFilter, CabinFilter, AirFilter, FuelFilter,
        BrakeFluid, BrakePadsFront, BrakePadsRear, BrakeDiscsFront, BrakeDiscsRear,
        TimingBelt, AccessoryBelt, Coolant, SparkPlugs, GlowPlugs,
        TransmissionFluid, DifferentialFluid, TireRotation, TireReplacement, Wipers,
        BatteryCheck, AcService, PowerSteeringFluid, DpfRegen, TechnicalInspection
    };

    public static bool IsKnown(string code) => All.Contains(code);
}
