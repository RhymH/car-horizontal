using CarHorizontal.Domain.Messaging;
using Microsoft.Extensions.Logging;

namespace CarHorizontal.Infrastructure.Messaging;

/// <summary>
/// Simulated e-mail sender: writes the message to the structured log and
/// reports success, without any external dependency. This is the default
/// provider for local/dev. Swap to a real <see cref="IEmailSender"/> (e.g.
/// SMTP/MailKit) by setting <c>Messaging:Email:Provider</c>.
/// </summary>
public sealed class LogEmailSender : IEmailSender
{
    private readonly ILogger<LogEmailSender> _logger;

    public LogEmailSender(ILogger<LogEmailSender> logger) => _logger = logger;

    public string Provider => "log";

    public Task<MessageDeliveryResult> SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var providerMessageId = $"log-email:{Guid.NewGuid():N}";
        _logger.LogInformation(
            "[SIMULATED EMAIL] To={To} Subject={Subject} BodyLength={BodyLength} Id={ProviderMessageId}",
            message.To, message.Subject, message.Body?.Length ?? 0, providerMessageId);
        return Task.FromResult(MessageDeliveryResult.Sent(Provider, providerMessageId));
    }
}
