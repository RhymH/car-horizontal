using CarHorizontal.Domain.Entities.Messaging;

namespace CarHorizontal.Domain.Messaging;

/// <summary>
/// Single entry point for outbound customer messaging. Routes a message to the
/// right channel sender and returns a faithful <see cref="MessageDeliveryResult"/>.
/// Reused by reminders, appointment confirmations, loyalty campaigns and the
/// mileage-check flow so they all share one delivery + logging contract.
/// </summary>
public interface IMessageDispatcher
{
    /// <param name="channel">Concrete channel to use — <see cref="MessageChannel.Sms"/> or <see cref="MessageChannel.Email"/>.</param>
    /// <param name="recipient">Phone number or e-mail address matching the channel.</param>
    /// <param name="subject">Subject line (e-mail only; ignored for SMS).</param>
    /// <param name="body">Message body.</param>
    Task<MessageDeliveryResult> DispatchAsync(
        MessageChannel channel,
        string? recipient,
        string? subject,
        string body,
        CancellationToken ct = default);
}
