using CarHorizontal.Domain.Entities.Timeline;

namespace CarHorizontal.Api.Modules.Timeline.Validators;

public static class TimelineValidationRules
{
    public const string KindError =
        "Kind must be one of: Maintenance, TechnicalInspection, TireSwap, TradeInOpportunity, WarrantyExpiry, Custom.";

    public const string StatusError =
        "Status must be one of: Pending, Triggered, Done, Skipped.";

    public static bool IsValidKind(string? value) =>
        !string.IsNullOrWhiteSpace(value)
        && Enum.TryParse<TimelineEventKind>(value, ignoreCase: true, out _);

    public static bool IsValidStatus(string? value) =>
        !string.IsNullOrWhiteSpace(value)
        && Enum.TryParse<TimelineEventStatus>(value, ignoreCase: true, out _);
}
