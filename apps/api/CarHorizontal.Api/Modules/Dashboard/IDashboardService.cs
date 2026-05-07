using CarHorizontal.Api.Modules.Dashboard.Dtos;

namespace CarHorizontal.Api.Modules.Dashboard;

public interface IDashboardService
{
    Task<DashboardOverviewResponseDto> GetOverviewAsync(CancellationToken ct = default);
}
