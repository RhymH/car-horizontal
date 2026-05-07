using CarHorizontal.Api.Modules.Timeline.Dtos;

namespace CarHorizontal.Api.Modules.Timeline;

public interface ITimelineService
{
    Task<TimelineListResponseDto> ListAsync(TimelineListRequestDto request, CancellationToken ct = default);
    Task<TimelineEventDto> CreateAsync(CreateTimelineEventRequestDto request, CancellationToken ct = default);
    Task<TimelineEventDto> UpdateAsync(Guid id, UpdateTimelineEventRequestDto request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<TimelineEventDto> CompleteAsync(Guid id, CancellationToken ct = default);
    Task<TimelineEventDto> SkipAsync(Guid id, CancellationToken ct = default);
    Task<TimelineEventDto> SnoozeAsync(Guid id, SnoozeTimelineEventRequestDto request, CancellationToken ct = default);
    Task<RegenerateTimelineResponseDto> RegenerateAsync(CancellationToken ct = default);
}
