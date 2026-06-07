namespace CarHorizontal.Domain.Messaging;

/// <summary>
/// Outcome of a single delivery attempt. The dispatch pipeline derives the
/// persisted reminder/message-log status from this result — it never assumes
/// success. This is what keeps the audit trail honest: a reminder is only
/// marked "Sent" when a sender actually reports success.
/// </summary>
public sealed record MessageDeliveryResult
{
    /// <summary>True when the provider accepted the message.</summary>
    public bool Success { get; init; }

    /// <summary>Name of the provider that handled (or rejected) the message, e.g. "log", "smtp".</summary>
    public string Provider { get; init; } = "unknown";

    /// <summary>Provider-side identifier, when the send succeeded.</summary>
    public string? ProviderMessageId { get; init; }

    /// <summary>Human-readable failure reason, when the send failed.</summary>
    public string? ErrorMessage { get; init; }

    public static MessageDeliveryResult Sent(string provider, string providerMessageId) =>
        new() { Success = true, Provider = provider, ProviderMessageId = providerMessageId };

    public static MessageDeliveryResult Failure(string provider, string error) =>
        new() { Success = false, Provider = provider, ErrorMessage = error };
}
