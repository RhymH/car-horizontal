namespace CarHorizontal.Domain.Messaging;

/// <summary>
/// An e-mail ready to be handed to an <see cref="IEmailSender"/>.
/// Channel-specific shape on purpose: e-mail has a subject, SMS does not.
/// </summary>
public sealed record EmailMessage(string To, string? Subject, string Body);

/// <summary>
/// An SMS ready to be handed to an <see cref="ISmsSender"/>.
/// </summary>
public sealed record SmsMessage(string To, string Body);
