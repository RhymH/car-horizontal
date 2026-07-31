namespace CarHorizontal.Api.Modules.Health.Dtos;

/// <summary>
/// Réponse de readiness : l'API répond ET ses dépendances (base) sont joignables.
/// <c>Status</c> vaut "ok" ou "degraded", <c>Database</c> vaut "ok" ou "unavailable".
/// </summary>
public sealed record ReadinessResponseDto(
    string Status,
    string Database,
    long DatabaseLatencyMs,
    DateTime TimestampUtc);
