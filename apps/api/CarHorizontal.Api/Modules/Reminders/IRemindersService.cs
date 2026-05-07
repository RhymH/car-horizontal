using CarHorizontal.Api.Modules.Reminders.Dtos;

namespace CarHorizontal.Api.Modules.Reminders;

public interface IRemindersService
{
    Task<ReminderListResponseDto> ListAsync(ReminderListRequestDto request, CancellationToken ct = default);
    Task<ReminderDto> GetAsync(Guid id, CancellationToken ct = default);
    Task<ReminderDto> CreateAsync(CreateReminderRequestDto request, CancellationToken ct = default);
    Task<ReminderDto> UpdateAsync(Guid id, UpdateReminderRequestDto request, CancellationToken ct = default);
    Task<ReminderDto> CancelAsync(Guid id, CancellationToken ct = default);
    Task<ReminderDto> SendNowAsync(Guid id, CancellationToken ct = default);
    Task<ReminderDto> SnoozeAsync(Guid id, SnoozeReminderRequestDto request, CancellationToken ct = default);
    Task<ReminderDto> CreateFromTimelineEventAsync(Guid timelineEventId, CreateFromTimelineRequestDto request, CancellationToken ct = default);
}
