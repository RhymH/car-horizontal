using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using CarHorizontal.Api.Modules.Organizations.Dtos;
using CarHorizontal.Domain.Entities.Identity;
using CarHorizontal.Domain.Entities.Organizations;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Organizations;

public class OrganizationService : IOrganizationService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public OrganizationService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<OrganizationBrandingResponseDto> GetBrandingAsync(CancellationToken ct = default)
    {
        var org = await RequireCurrentOrganizationAsync(track: false, ct);
        return ToBrandingDto(org);
    }

    public async Task<OrganizationBrandingResponseDto> UpdateBrandingAsync(
        UpdateOrganizationBrandingRequestDto request, CancellationToken ct = default)
    {
        var org = await RequireCurrentOrganizationAsync(track: true, ct);

        org.Name = request.Name.Trim();
        org.BrandPrimaryColor = NormalizeOrNull(request.BrandPrimaryColor)?.ToLowerInvariant();
        org.BrandLogoUrl = NormalizeOrNull(request.BrandLogoUrl);
        org.BrandCoverImageUrl = NormalizeOrNull(request.BrandCoverImageUrl);
        org.BrandTagline = NormalizeOrNull(request.BrandTagline);
        org.ContactPhone = NormalizeOrNull(request.ContactPhone);

        await _db.SaveChangesAsync(ct);
        return ToBrandingDto(org);
    }

    private async Task<Organization> RequireCurrentOrganizationAsync(bool track, CancellationToken ct)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Organisation courante requise.");

        var query = track ? _db.Organizations : _db.Organizations.AsNoTracking();
        return await query.FirstOrDefaultAsync(o => o.Id == orgId, ct)
            ?? throw new KeyNotFoundException("Organisation introuvable.");
    }

    private static OrganizationBrandingResponseDto ToBrandingDto(Organization org) => new()
    {
        Name = org.Name,
        Slug = org.Slug,
        BrandPrimaryColor = org.BrandPrimaryColor,
        BrandLogoUrl = org.BrandLogoUrl,
        BrandCoverImageUrl = org.BrandCoverImageUrl,
        BrandTagline = org.BrandTagline,
        ContactPhone = org.ContactPhone
    };

    private static string? NormalizeOrNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
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
