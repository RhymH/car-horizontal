namespace CarHorizontal.Domain.Entities.Leasing;

public enum LeasingContractStatus
{
    /// <summary>Contrat en cours.</summary>
    Active = 0,

    /// <summary>Contrat arrivé à terme (échéance passée / restitué).</summary>
    Ended = 1,

    /// <summary>Contrat résilié avant terme.</summary>
    Cancelled = 2
}
