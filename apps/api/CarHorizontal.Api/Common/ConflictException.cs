namespace CarHorizontal.Api.Common;

/// <summary>
/// Levée quand une règle métier interdit l'opération à cause d'un conflit avec
/// l'état existant (ex. deux contrats de leasing actifs sur le même véhicule).
/// Mappée en HTTP 409 par <c>ExceptionHandlingMiddleware</c>.
/// </summary>
public class ConflictException : Exception
{
    public ConflictException(string message) : base(message) { }
}
