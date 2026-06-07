using CarHorizontal.Domain.Messaging;
using Microsoft.Extensions.Logging;

namespace CarHorizontal.Infrastructure.Messaging;

/// <summary>
/// Simulated SMS sender: writes the message to the structured log and reports
/// success, without any external dependency. Default provider for local/dev.
/// Swap to a real operator (Twilio, OVH, …) by setting <c>Messaging:Sms:Provider</c>.
/// </summary>
public sealed class LogSmsSender : ISmsSender
{
    private readonly ILogger<LogSmsSender> _logger;

    public LogSmsSender(ILogger<LogSmsSender> logger) => _logger = logger;

    public string Provider => "log";

    public Task<MessageDeliveryResult> SendAsync(SmsMessage message, CancellationToken ct = default)
    {
        var providerMessageId = $"log-sms:{Guid.NewGuid():N}";
        _logger.LogInformation(
            "[SIMULATED SMS] To={To} BodyLength={BodyLength} Id={ProviderMessageId}",
            message.To, message.Body?.Length ?? 0, providerMessageId);
        return Task.FromResult(MessageDeliveryResult.Sent(Provider, providerMessageId));
    }
}
