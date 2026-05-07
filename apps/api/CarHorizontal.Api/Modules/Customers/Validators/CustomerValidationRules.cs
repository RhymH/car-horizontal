using CarHorizontal.Domain.Entities.Customers;

namespace CarHorizontal.Api.Modules.Customers.Validators;

internal static class CustomerValidationRules
{
    public const string PhoneE164Pattern = @"^\+[1-9]\d{6,14}$";

    public static bool IsValidStatus(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return false;
        return Enum.TryParse<CustomerStatus>(raw, ignoreCase: true, out _);
    }

    public static bool IsValidInteractionType(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return false;
        return Enum.TryParse<CustomerInteractionType>(raw, ignoreCase: true, out _);
    }
}
