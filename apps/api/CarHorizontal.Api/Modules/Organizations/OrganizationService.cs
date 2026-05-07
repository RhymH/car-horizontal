using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using CarHorizontal.Domain.Entities.Identity;
using CarHorizontal.Domain.Entities.Organizations;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Organizations;

public class OrganizationService : IOrganizationService
{
    private readonly AppDbContext _db;

    public OrganizationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Organization> CreateForOwnerAsync(
        Guid ownerUserId,
        string ownerFullName,
        CancellationToken ct = default)
    {
        var safeName = string.IsNullOrWhiteSpace(ownerFullName) ? "Mon Garage" : $"{ownerFullName.Trim()}'s Garage";
        var slug = await GenerateUniqueSlugAsync(safeName, ct);

        var org = new Organization
        {
            Name = safeName,
            Slug = slug
        };

        _db.Organizations.Add(org);
        _db.UserOrganizations.Add(new UserOrganization
        {
            UserId = ownerUserId,
            OrganizationId = org.Id,
            Role = OrganizationRole.Owner
        });

        await _db.SaveChangesAsync(ct);
        return org;
    }

    private async Task<string> GenerateUniqueSlugAsync(string source, CancellationToken ct)
    {
        var baseSlug = ToKebabCase(source);
        if (string.IsNullOrEmpty(baseSlug)) baseSlug = "garage";

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var suffix = RandomSuffix();
            var candidate = $"{baseSlug}-{suffix}";
            var exists = await _db.Organizations
                .IgnoreQueryFilters()
                .AnyAsync(o => o.Slug == candidate, ct);
            if (!exists) return candidate;
        }

        return $"{baseSlug}-{Guid.NewGuid():N}".Substring(0, Math.Min(60, baseSlug.Length + 33));
    }

    private static string ToKebabCase(string input)
    {
        var normalized = input.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(ch);
            }
        }

        var stripped = sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
        var slug = Regex.Replace(stripped, @"[^a-z0-9]+", "-").Trim('-');
        if (slug.Length > 40) slug = slug[..40].TrimEnd('-');
        return slug;
    }

    private static string RandomSuffix()
    {
        var bytes = RandomNumberGenerator.GetBytes(3);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
