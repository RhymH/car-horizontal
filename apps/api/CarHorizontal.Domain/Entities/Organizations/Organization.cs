using CarHorizontal.Domain.Common;

namespace CarHorizontal.Domain.Entities.Organizations;

public class Organization : EntityBase
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public Guid? LogoFileId { get; set; }
    public string DefaultLocale { get; set; } = "fr-FR";
    public string Timezone { get; set; } = "Europe/Paris";
    public string PhoneCountryCode { get; set; } = "+33";
}
