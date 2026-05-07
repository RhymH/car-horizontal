namespace CarHorizontal.Api.Modules.MileageCheck.Dtos;

public class RequestMileageResponseDto
{
    public Guid ReminderId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}
