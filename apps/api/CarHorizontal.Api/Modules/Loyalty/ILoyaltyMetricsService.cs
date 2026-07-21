using CarHorizontal.Api.Modules.Loyalty.Dtos;

namespace CarHorizontal.Api.Modules.Loyalty;

public interface ILoyaltyMetricsService
{
    Task<LoyaltyOverviewResponseDto> GetOverviewAsync(CancellationToken ct = default);
    Task<LoyaltyCohortsResponseDto> GetCohortsAsync(CancellationToken ct = default);
    Task<LoyaltyRetentionCurveResponseDto> GetRetentionCurveAsync(DateTime? from, DateTime? to, CancellationToken ct = default);
    Task<LoyaltyCustomerListResponseDto> GetAtRiskCustomersAsync(int? limit, CancellationToken ct = default);
    Task<LoyaltyCustomerListResponseDto> GetLostCustomersAsync(int? limit, CancellationToken ct = default);
    Task<List<LoyaltyTrendPointDto>> GetRetentionTrendAsync(CancellationToken ct = default);
    Task RecomputeForCurrentOrgAsync(CancellationToken ct = default);
}
