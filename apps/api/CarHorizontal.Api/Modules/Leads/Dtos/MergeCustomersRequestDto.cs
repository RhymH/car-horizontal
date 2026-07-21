namespace CarHorizontal.Api.Modules.Leads.Dtos;

public class MergeCustomersRequestDto
{
    /// <summary>The customer that survives the merge.</summary>
    public Guid PrimaryCustomerId { get; set; }

    /// <summary>The duplicate; its data is transferred then it is soft-deleted.</summary>
    public Guid DuplicateCustomerId { get; set; }
}

public class MergeCustomersResponseDto
{
    public Guid PrimaryCustomerId { get; set; }
    public int MovedVehicles { get; set; }
    public int MovedInteractions { get; set; }
    public int MovedAppointments { get; set; }
    public int MovedFollowUps { get; set; }
    public int MovedOther { get; set; }
}
