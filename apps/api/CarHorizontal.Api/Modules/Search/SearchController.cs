using System.Text.RegularExpressions;
using CarHorizontal.Api.Common;
using CarHorizontal.Api.Modules.Search.Dtos;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Search;

[ApiController]
[Authorize]
[Route("api/search")]
public class SearchController : ControllerBase
{
    private const int MaxResultsPerCategory = 8;
    private readonly AppDbContext _db;

    public SearchController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<SearchResultsDto>> Search(
        [FromQuery] string? q,
        CancellationToken ct)
    {
        var trimmed = q?.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed.Length < 2)
        {
            return Ok(new SearchResultsDto());
        }

        var pattern = $"%{trimmed}%";
        var phoneSuffix = PhoneSearch.ExtractDigitSuffix(trimmed);
        var phonePattern = phoneSuffix is null ? null : $"%{phoneSuffix}%";
        var plateRegex = PlateSearch.BuildLikeRegex(trimmed);

        var customers = await _db.Customers
            .AsNoTracking()
            .Where(c =>
                EF.Functions.ILike(c.FullName, pattern)
                || (c.Email != null && EF.Functions.ILike(c.Email, pattern))
                || (c.Phone != null && EF.Functions.ILike(c.Phone, pattern))
                || (phonePattern != null && c.Phone != null && EF.Functions.ILike(c.Phone, phonePattern)))
            .OrderBy(c => c.FullName)
            .Take(MaxResultsPerCategory)
            .Select(c => new SearchCustomerDto
            {
                Id = c.Id,
                FullName = c.FullName,
                Email = c.Email,
                Phone = c.Phone
            })
            .ToListAsync(ct);

        var vehicles = await _db.Vehicles
            .AsNoTracking()
            .Where(v =>
                (plateRegex != null && Regex.IsMatch(v.LicensePlate, plateRegex))
                || EF.Functions.ILike(v.Make, pattern)
                || EF.Functions.ILike(v.Model, pattern))
            .OrderBy(v => v.LicensePlate)
            .Take(MaxResultsPerCategory)
            .Select(v => new SearchVehicleDto
            {
                Id = v.Id,
                CustomerId = v.CustomerId,
                LicensePlate = v.LicensePlate,
                Make = v.Make,
                Model = v.Model,
                Year = v.Year
            })
            .ToListAsync(ct);

        return Ok(new SearchResultsDto
        {
            Customers = customers,
            Vehicles = vehicles
        });
    }
}
