using CarHorizontal.Domain.Entities.Messaging;
using CarHorizontal.Domain.Messaging;
using Microsoft.Extensions.Logging;

namespace CarHorizontal.Infrastructure.Messaging;

/// <summary>
/// Routes an outbound message to the configured channel sender and returns a
/// faithful delivery result. Failures are returned, not thrown, so callers can
/// persist an accurate status.
/// </summary>
public sealed class MessageDispatcher : IMessageDispatcher
{
    private readonly IEmailSender _emailSender;
    private readonly ISmsSender _smsSender;
    private readonly ILogger<MessageDispatcher> _logger;

    public MessageDispatcher(
        IEmailSender emailSender,
        ISmsSender smsSender,
        ILogger<MessageDispatcher> logger)
    {
        _emailSender = emailSender;
        _smsSender = smsSender;
        _logger = logger;
    }

    public async Task<MessageDeliveryResult> DispatchAsync(
        MessageChannel channel,
        string? recipient,
        string? subject,
        string body,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(recipient))
        {
            return MessageDeliveryResult.Failure(
                "none",
                $"No recipient available for channel '{channel}'.");
        }

        try
        {
            return channel switch
            {
                MessageChannel.Email => await _emailSender.SendAsync(new EmailMessage(recipient, subject, body), ct),
                MessageChannel.Sms => await _smsSender.SendAsync(new SmsMessage(recipient, body), ct),
                _ => MessageDeliveryResult.Failure(
                    "none",
                    $"Channel '{channel}' is not supported for direct dispatch (use Sms or Email).")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Dispatch failed for channel {Channel} to {Recipient}", channel, recipient);
            return MessageDeliveryResult.Failure(channel.ToString().ToLowerInvariant(), ex.Message);
        }
    }
}
