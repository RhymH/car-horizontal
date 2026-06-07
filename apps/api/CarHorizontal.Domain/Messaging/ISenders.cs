namespace CarHorizontal.Domain.Messaging;

/// <summary>
/// Sends a single e-mail. Implementations live in Infrastructure and are
/// selected by configuration (<c>Messaging:Email:Provider</c>). The "log"
/// provider simulates delivery for local/dev without external dependencies.
/// </summary>
public interface IEmailSender
{
    /// <summary>Provider name reported on the <see cref="MessageDeliveryResult"/>.</summary>
    string Provider { get; }

    Task<MessageDeliveryResult> SendAsync(EmailMessage message, CancellationToken ct = default);
}

/// <summary>
/// Sends a single SMS. Selected by configuration (<c>Messaging:Sms:Provider</c>).
/// </summary>
public interface ISmsSender
{
    string Provider { get; }

    Task<MessageDeliveryResult> SendAsync(SmsMessage message, CancellationToken ct = default);
}
