using CarHorizontal.Api.Modules.Leads.Dtos;

namespace CarHorizontal.Api.Modules.Leads;

public interface ILeadsService
{
    Task<LeadsListResponseDto> ListAsync(LeadsListRequestDto request, CancellationToken ct = default);
    Task<LeadDetailDto> GetAsync(Guid customerId, CancellationToken ct = default);
    Task<LeadDetailDto> UpdateAsync(Guid customerId, UpdateLeadRequestDto request, CancellationToken ct = default);

    Task<LeadFollowUpDto> AddFollowUpAsync(Guid customerId, CreateLeadFollowUpRequestDto request, CancellationToken ct = default);
    Task<LeadFollowUpDto> CompleteFollowUpAsync(Guid followUpId, CompleteLeadFollowUpRequestDto request, CancellationToken ct = default);
    Task<LeadFollowUpDto> CancelFollowUpAsync(Guid followUpId, CancellationToken ct = default);

    Task<LeadDuplicatesResponseDto> FindDuplicatesAsync(CancellationToken ct = default);
    Task<MergeCustomersResponseDto> MergeAsync(MergeCustomersRequestDto request, CancellationToken ct = default);

    Task<LeadImportResultDto> ImportAsync(LeadImportRequestDto request, CancellationToken ct = default);

    Task<List<LeadTeamMemberDto>> GetTeamAsync(CancellationToken ct = default);

    Task<LeadStatsResponseDto> GetStatsAsync(LeadStatsRequestDto request, CancellationToken ct = default);
}
