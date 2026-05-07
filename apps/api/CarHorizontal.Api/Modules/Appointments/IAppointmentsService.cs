using CarHorizontal.Api.Modules.Appointments.Dtos;

namespace CarHorizontal.Api.Modules.Appointments;

public interface IAppointmentsService
{
    Task<AppointmentListResponseDto> ListAsync(AppointmentListRequestDto request, CancellationToken ct = default);
    Task<AppointmentDto> GetAsync(Guid id, CancellationToken ct = default);
    Task<AppointmentDto> CreateAsync(CreateAppointmentRequestDto request, CancellationToken ct = default);
    Task<AppointmentDto> UpdateAsync(Guid id, UpdateAppointmentRequestDto request, CancellationToken ct = default);
    Task<AppointmentDto> ConfirmAsync(Guid id, CancellationToken ct = default);
    Task<AppointmentDto> CancelAsync(Guid id, CancellationToken ct = default);
    Task<AppointmentDto> MarkDoneAsync(Guid id, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
