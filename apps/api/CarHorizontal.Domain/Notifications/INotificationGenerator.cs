namespace CarHorizontal.Domain.Notifications;

/// <summary>
/// Turns timeline signals and CRM heuristics into staff notifications.
/// Idempotent: running it repeatedly does not create duplicates while an
/// equivalent notification is still open.
/// </summary>
public interface INotificationGenerator
{
    /// <summary>Generate for every organization (used by the nightly job).</summary>
    Task<int> GenerateAsync(CancellationToken ct = default);

    /// <summary>Generate for a single organization.</summary>
    Task<int> GenerateForOrganizationAsync(Guid organizationId, CancellationToken ct = default);
}
