namespace CarHorizontal.Api.Modules.Timeline.Dtos;

public class TimelineListResponseDto
{
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public IReadOnlyList<TimelineEventDto> Items { get; set; } = Array.Empty<TimelineEventDto>();
}
