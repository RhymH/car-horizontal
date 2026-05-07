using CarHorizontal.Domain.Entities.Messaging;
using CarHorizontal.Domain.Entities.Reminders;

namespace CarHorizontal.Api.Modules.Reminders.Validators;

public static class ReminderValidationRules
{
    public const string ChannelError =
        "Channel must be one of: Sms, Email, Both.";

    public const string StatusError =
        "Status must be one of: Scheduled, Sent, Failed, Cancelled, Snoozed.";

    public static bool IsValidChannel(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        if (!Enum.TryParse<MessageChannel>(value, ignoreCase: true, out var channel)) return false;
        return channel == MessageChannel.Sms
            || channel == MessageChannel.Email
            || channel == MessageChannel.Both;
    }

    public static bool IsValidStatus(string? value) =>
        !string.IsNullOrWhiteSpace(value)
        && Enum.TryParse<ReminderStatus>(value, ignoreCase: true, out _);
}
