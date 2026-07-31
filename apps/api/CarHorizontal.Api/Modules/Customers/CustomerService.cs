using CarHorizontal.Api.Common;
using CarHorizontal.Api.Modules.Customers.Dtos;
using CarHorizontal.Domain.Entities.Customers;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Customers;

public class CustomerService : ICustomerService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CustomerService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<CustomersListResponseDto> ListAsync(CustomersListRequestDto request, CancellationToken ct = default)
    {
        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize switch
        {
            <= 0 => 25,
            > 100 => 100,
            _ => request.PageSize
        };

        var query = _db.Customers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim();
            var pattern = $"%{s}%";
            var phoneSuffix = PhoneSearch.ExtractDigitSuffix(s);
            var phonePattern = phoneSuffix is null ? null : $"%{phoneSuffix}%";

            query = query.Where(c =>
                EF.Functions.ILike(c.FullName, pattern)
                || (c.Email != null && EF.Functions.ILike(c.Email, pattern))
                || (c.Phone != null && EF.Functions.ILike(c.Phone, pattern))
                || (phonePattern != null && c.Phone != null && EF.Functions.ILike(c.Phone, phonePattern)));
        }

        if (!string.IsNullOrWhiteSpace(request.Status)
            && Enum.TryParse<CustomerStatus>(request.Status, ignoreCase: true, out var statusEnum))
        {
            query = query.Where(c => c.Status == statusEnum);
        }

        if (request.ExcludeProspects)
        {
            query = query.Where(c => c.Status != CustomerStatus.Prospect);
        }

        var total = await query.CountAsync(ct);

        var sortDir = string.Equals(request.SortDir, "desc", StringComparison.OrdinalIgnoreCase) ? "desc" : "asc";
        query = (request.SortBy?.ToLowerInvariant()) switch
        {
            "fullname" => sortDir == "desc" ? query.OrderByDescending(c => c.FullName) : query.OrderBy(c => c.FullName),
            "acquiredat" => sortDir == "desc" ? query.OrderByDescending(c => c.AcquiredAt) : query.OrderBy(c => c.AcquiredAt),
            "createdat" => sortDir == "desc" ? query.OrderByDescending(c => c.CreatedAt) : query.OrderBy(c => c.CreatedAt),
            "status" => sortDir == "desc" ? query.OrderByDescending(c => c.Status) : query.OrderBy(c => c.Status),
            _ => query.OrderBy(c => c.FullName)
        };

        var pageItems = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                c.Id,
                c.FullName,
                c.Email,
                c.Phone,
                c.City,
                c.Status,
                c.AcquiredAt,
                c.Tags,
                c.SalespersonUserId,
                SalespersonName = c.SalespersonUserId == null
                    ? null
                    : _db.Users.Where(u => u.Id == c.SalespersonUserId).Select(u => u.FullName).FirstOrDefault(),
                VehicleCount = _db.Vehicles.Count(v => v.CustomerId == c.Id)
            })
            .ToListAsync(ct);

        return new CustomersListResponseDto
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Items = pageItems.Select(x => new CustomerListItemDto
            {
                Id = x.Id,
                FullName = x.FullName,
                Email = x.Email,
                Phone = x.Phone,
                City = x.City,
                Status = x.Status.ToString(),
                AcquiredAt = x.AcquiredAt,
                Tags = x.Tags,
                SalespersonUserId = x.SalespersonUserId,
                SalespersonName = x.SalespersonName,
                VehicleCount = x.VehicleCount
            }).ToList()
        };
    }

    public async Task<CustomerDetailDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var customer = await _db.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException($"Customer {id} not found.");

        var salespersonName = customer.SalespersonUserId is null
            ? null
            : await _db.Users
                .AsNoTracking()
                .Where(u => u.Id == customer.SalespersonUserId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync(ct);

        var vehicles = await _db.Vehicles
            .AsNoTracking()
            .Where(v => v.CustomerId == id)
            .OrderBy(v => v.Make).ThenBy(v => v.Model)
            .Select(v => new CustomerVehicleDto
            {
                Id = v.Id,
                Make = v.Make,
                Model = v.Model,
                Year = v.Year,
                LicensePlate = v.LicensePlate,
                CurrentMileage = v.CurrentMileage,
                EngineType = v.EngineType.HasValue ? v.EngineType.Value.ToString() : null,
                PhotoFileId = v.PhotoFileId
            })
            .ToListAsync(ct);

        var interactions = await _db.CustomerInteractions
            .AsNoTracking()
            .Where(i => i.CustomerId == id)
            .OrderByDescending(i => i.OccurredAt)
            .Take(5)
            .Select(i => new CustomerInteractionDto
            {
                Id = i.Id,
                CustomerId = i.CustomerId,
                Type = i.Type.ToString(),
                OccurredAt = i.OccurredAt,
                Summary = i.Summary,
                AuthorUserId = i.AuthorUserId
            })
            .ToListAsync(ct);

        return new CustomerDetailDto
        {
            Id = customer.Id,
            FullName = customer.FullName,
            Email = customer.Email,
            Phone = customer.Phone,
            Address = customer.Address,
            City = customer.City,
            PostalCode = customer.PostalCode,
            Notes = customer.Notes,
            AcquiredAt = customer.AcquiredAt,
            Status = customer.Status.ToString(),
            Tags = customer.Tags,
            SalespersonUserId = customer.SalespersonUserId,
            SalespersonName = salespersonName,
            CreatedAt = customer.CreatedAt,
            UpdatedAt = customer.UpdatedAt,
            Vehicles = vehicles,
            RecentInteractions = interactions
        };
    }

    public async Task<CustomerDetailDto> CreateAsync(CreateCustomerRequestDto request, CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");

        var orgCountryCode = await GetOrgPhoneCountryCodeAsync(orgId, ct);

        if (request.SalespersonUserId.HasValue)
        {
            await EnsureSalespersonAsync(orgId, request.SalespersonUserId.Value, ct);
        }

        var customer = new Customer
        {
            OrganizationId = orgId,
            FullName = request.FullName.Trim(),
            Email = NormalizeOptional(request.Email),
            Phone = NormalizePhone(request.Phone, orgCountryCode),
            Address = NormalizeOptional(request.Address),
            City = NormalizeOptional(request.City),
            PostalCode = NormalizeOptional(request.PostalCode),
            Notes = NormalizeOptional(request.Notes),
            AcquiredAt = request.AcquiredAt == default ? DateTime.UtcNow : request.AcquiredAt,
            Status = ParseStatus(request.Status),
            Tags = request.Tags ?? Array.Empty<string>(),
            SalespersonUserId = request.SalespersonUserId
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);

        return await GetAsync(customer.Id, ct);
    }

    public async Task<CustomerDetailDto> UpdateAsync(Guid id, UpdateCustomerRequestDto request, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException($"Customer {id} not found.");

        if (request.FullName is not null) customer.FullName = request.FullName.Trim();
        if (request.Email is not null) customer.Email = NormalizeOptional(request.Email);
        if (request.Phone is not null)
        {
            var orgCountryCode = await GetOrgPhoneCountryCodeAsync(customer.OrganizationId, ct);
            customer.Phone = NormalizePhone(request.Phone, orgCountryCode);
        }
        if (request.Address is not null) customer.Address = NormalizeOptional(request.Address);
        if (request.City is not null) customer.City = NormalizeOptional(request.City);
        if (request.PostalCode is not null) customer.PostalCode = NormalizeOptional(request.PostalCode);
        if (request.Notes is not null) customer.Notes = NormalizeOptional(request.Notes);
        if (request.AcquiredAt.HasValue) customer.AcquiredAt = request.AcquiredAt.Value;
        if (request.Status is not null) customer.Status = ParseStatus(request.Status);
        if (request.Tags is not null) customer.Tags = request.Tags;

        if (request.ClearSalesperson)
        {
            customer.SalespersonUserId = null;
        }
        else if (request.SalespersonUserId.HasValue
                 && request.SalespersonUserId.Value != customer.SalespersonUserId)
        {
            await EnsureSalespersonAsync(customer.OrganizationId, request.SalespersonUserId.Value, ct);
            customer.SalespersonUserId = request.SalespersonUserId.Value;
        }

        await _db.SaveChangesAsync(ct);
        return await GetAsync(customer.Id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException($"Customer {id} not found.");

        // Soft delete via interceptor: setting DeletedAt is handled there, but we also call Remove
        // so the interceptor (SoftDeleteInterceptor) catches it. We do NOT cascade to vehicles.
        _db.Customers.Remove(customer);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<CustomerInteractionDto> AddInteractionAsync(Guid customerId, AddInteractionRequestDto request, CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Active user is required.");

        var exists = await _db.Customers.AnyAsync(c => c.Id == customerId, ct);
        if (!exists) throw new KeyNotFoundException($"Customer {customerId} not found.");

        var interaction = new CustomerInteraction
        {
            OrganizationId = orgId,
            CustomerId = customerId,
            Type = Enum.Parse<CustomerInteractionType>(request.Type, ignoreCase: true),
            OccurredAt = request.OccurredAt == default ? DateTime.UtcNow : request.OccurredAt,
            Summary = request.Summary.Trim(),
            AuthorUserId = userId
        };

        _db.CustomerInteractions.Add(interaction);
        await _db.SaveChangesAsync(ct);

        return new CustomerInteractionDto
        {
            Id = interaction.Id,
            CustomerId = interaction.CustomerId,
            Type = interaction.Type.ToString(),
            OccurredAt = interaction.OccurredAt,
            Summary = interaction.Summary,
            AuthorUserId = interaction.AuthorUserId
        };
    }

    /// <summary>
    /// A salesperson must be a member of the customer's organization — the
    /// caller-supplied id is never trusted on its own.
    /// </summary>
    private async Task EnsureSalespersonAsync(Guid orgId, Guid userId, CancellationToken ct)
    {
        var isMember = await _db.UserOrganizations
            .AsNoTracking()
            .AnyAsync(uo => uo.OrganizationId == orgId && uo.UserId == userId, ct);

        if (!isMember)
        {
            throw new KeyNotFoundException($"User {userId} is not a member of this organization.");
        }
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim();
    }

    private static string? NormalizePhone(string? raw, string? orgCountryCode)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        // Try to canonicalise to E.164 using the org's country code; fall
        // back to the trimmed raw input so the user's value is never silently lost.
        return PhoneNormalizer.Normalize(raw, orgCountryCode) ?? raw.Trim();
    }

    private async Task<string?> GetOrgPhoneCountryCodeAsync(Guid orgId, CancellationToken ct)
    {
        return await _db.Organizations
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(o => o.Id == orgId && o.DeletedAt == null)
            .Select(o => o.PhoneCountryCode)
            .FirstOrDefaultAsync(ct);
    }

    private static CustomerStatus ParseStatus(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return CustomerStatus.Active;
        return Enum.Parse<CustomerStatus>(raw, ignoreCase: true);
    }
}
