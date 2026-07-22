namespace CarHorizontal.Domain.Vehicles;

/// <summary>
/// Decodes a Vehicle Identification Number into the fields we can infer.
/// The offline implementation uses structural rules + a manufacturer table;
/// a richer provider (e.g. NHTSA vPIC) decodes over the network and falls back
/// to the offline result on failure — both behind this contract. The call is
/// async because a provider may perform I/O.
/// </summary>
public interface IVinDecoder
{
    Task<VinDecodeResult> DecodeAsync(string? vin, CancellationToken ct = default);
}
