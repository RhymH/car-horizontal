namespace CarHorizontal.Domain.Entities.Notifications;

/// <summary>
/// The single most relevant next step a collaborator can take. The portal turns
/// this into a "1-click" button (deep-link / pre-filled flow).
/// </summary>
public enum NotificationAction
{
    /// <summary>Open the customer file.</summary>
    ViewCustomer = 0,

    /// <summary>Open the vehicle file.</summary>
    ViewVehicle = 1,

    /// <summary>Start an appointment, pre-filled for this customer/vehicle.</summary>
    CreateAppointment = 2,

    /// <summary>Send a reminder to the customer.</summary>
    SendReminder = 3
}
