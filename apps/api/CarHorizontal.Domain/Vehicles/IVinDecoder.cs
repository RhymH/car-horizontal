namespace CarHorizontal.Domain.Vehicles;

/// <summary>
/// Decodes a Vehicle Identification Number into the fields we can infer locally.
/// The default implementation is fully offline (structural rules + a manufacturer
/// table); a richer provider (e.g. NHTSA vPIC) can replace it behind this contract.
/// </summary>
public interface IVinDecoder
{
    VinDecodeResult Decode(string? vin);
}
