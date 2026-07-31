namespace CarHorizontal.Api.Modules.Health.Dtos;

/// <summary>Réponse de liveness : l'API répond, sans aucune dépendance externe.</summary>
public sealed record HealthResponseDto(
    string Status,
    string Service,
    DateTime TimestampUtc);
