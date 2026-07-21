using System.Text.Json;
using CarHorizontal.Api.Common;
using CarHorizontal.Api.Modules.Leads.Dtos;
using CarHorizontal.Domain.Entities.Customers;
using CarHorizontal.Domain.Entities.Leads;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Leads;

public class LeadsService : ILeadsService
{
    private static readonly JsonSerializerOptions ReportJsonOptions = new(JsonSerializerDefaults.Web);

    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public LeadsService(AppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    // ── Liste ────────────────────────────────────────────────────────────────

    public async Task<LeadsListResponseDto> ListAsync(LeadsListRequestDto request, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize switch
        {
            <= 0 => 25,
            > 100 => 100,
            _ => request.PageSize
        };

        // A lead = a Prospect customer, or any customer that has a lead profile
        // (keeps Won/Lost leads reachable through explicit stage filters).
        var query =
            from c in _db.Customers.AsNoTracking()
            join lp in _db.LeadProfiles.AsNoTracking() on c.Id equals lp.CustomerId into lps
            from lp in lps.DefaultIfEmpty()
            where c.Status == CustomerStatus.Prospect || lp != null
            select new { c, lp };

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim();
            var pattern = $"%{s}%";
            var phoneSuffix = PhoneSearch.ExtractDigitSuffix(s);
            var phonePattern = phoneSuffix is null ? null : $"%{phoneSuffix}%";

            query = query.Where(x =>
                EF.Functions.ILike(x.c.FullName, pattern)
                || (x.c.Email != null && EF.Functions.ILike(x.c.Email, pattern))
                || (x.c.Phone != null && EF.Functions.ILike(x.c.Phone, pattern))
                || (phonePattern != null && x.c.Phone != null && EF.Functions.ILike(x.c.Phone, phonePattern)));
        }

        // A missing profile row is an implicit "New" stage.
        if (string.Equals(request.Stage, "Open", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.lp == null
                || (x.lp.Stage != LeadStage.Won && x.lp.Stage != LeadStage.Lost));
        }
        else if (Enum.TryParse<LeadStage>(request.Stage, ignoreCase: true, out var stage))
        {
            query = stage == LeadStage.New
                ? query.Where(x => x.lp == null || x.lp.Stage == LeadStage.New)
                : query.Where(x => x.lp != null && x.lp.Stage == stage);
        }

        if (Enum.TryParse<LeadSource>(request.Source, ignoreCase: true, out var source))
            query = query.Where(x => x.lp != null && x.lp.Source == source);

        if (request.AssignedToUserId is { } assignee)
            query = query.Where(x => x.lp != null && x.lp.AssignedToUserId == assignee);

        if (request.Overdue)
            query = query.Where(x => x.lp != null && x.lp.NextFollowUpAt != null && x.lp.NextFollowUpAt < now);

        var total = await query.CountAsync(ct);

        var overdueCount = await (
            from c in _db.Customers.AsNoTracking()
            join lp in _db.LeadProfiles.AsNoTracking() on c.Id equals lp.CustomerId
            where (c.Status == CustomerStatus.Prospect
                    || (lp.Stage != LeadStage.Won && lp.Stage != LeadStage.Lost))
                && lp.NextFollowUpAt != null && lp.NextFollowUpAt < now
            select c.Id).CountAsync(ct);

        var sortDesc = string.Equals(request.SortDir, "desc", StringComparison.OrdinalIgnoreCase);
        query = (request.SortBy?.ToLowerInvariant()) switch
        {
            "name" => sortDesc ? query.OrderByDescending(x => x.c.FullName) : query.OrderBy(x => x.c.FullName),
            "stage" => sortDesc
                ? query.OrderByDescending(x => x.lp == null ? LeadStage.New : x.lp.Stage)
                : query.OrderBy(x => x.lp == null ? LeadStage.New : x.lp.Stage),
            "createdat" => sortDesc ? query.OrderByDescending(x => x.c.CreatedAt) : query.OrderBy(x => x.c.CreatedAt),
            // Default: actionable first — overdue/nearest follow-up on top, leads
            // without any planned follow-up at the end (they need one scheduled).
            _ => query
                .OrderBy(x => x.lp == null || x.lp.NextFollowUpAt == null)
                .ThenBy(x => x.lp!.NextFollowUpAt)
                .ThenBy(x => x.c.FullName)
        };

        var rows = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.c.Id,
                x.c.FullName,
                x.c.Email,
                x.c.Phone,
                x.c.City,
                x.c.Tags,
                x.c.CreatedAt,
                Profile = x.lp,
                VehicleCount = _db.Vehicles.Count(v => v.CustomerId == x.c.Id),
                LastInteractionAt = _db.CustomerInteractions
                    .Where(i => i.CustomerId == x.c.Id)
                    .Max(i => (DateTime?)i.OccurredAt),
                AssignedToName = x.lp == null || x.lp.AssignedToUserId == null
                    ? null
                    : _db.Users.Where(u => u.Id == x.lp.AssignedToUserId)
                        .Select(u => u.FullName).FirstOrDefault()
            })
            .ToListAsync(ct);

        return new LeadsListResponseDto
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            OverdueCount = overdueCount,
            Items = rows.Select(x => new LeadListItemDto
            {
                CustomerId = x.Id,
                FullName = x.FullName,
                Email = x.Email,
                Phone = x.Phone,
                City = x.City,
                Tags = x.Tags,
                CreatedAt = x.CreatedAt,
                Stage = (x.Profile?.Stage ?? LeadStage.New).ToString(),
                StageChangedAt = x.Profile?.StageChangedAt ?? x.CreatedAt,
                Source = (x.Profile?.Source ?? LeadSource.Unknown).ToString(),
                SourceDetail = x.Profile?.SourceDetail,
                AssignedToUserId = x.Profile?.AssignedToUserId,
                AssignedToName = x.AssignedToName,
                InterestSummary = x.Profile?.InterestSummary,
                NextFollowUpAt = x.Profile?.NextFollowUpAt,
                LastInteractionAt = x.LastInteractionAt,
                VehicleCount = x.VehicleCount
            }).ToList()
        };
    }

    // ── Détail / profil ──────────────────────────────────────────────────────

    public async Task<LeadDetailDto> GetAsync(Guid customerId, CancellationToken ct = default)
    {
        var customer = await _db.Customers.AsNoTracking()
            .Where(c => c.Id == customerId)
            .Select(c => new { c.Id, c.FullName })
            .FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException($"Customer {customerId} not found.");

        var profile = await _db.LeadProfiles.AsNoTracking()
            .FirstOrDefaultAsync(l => l.CustomerId == customerId, ct);

        var followUps = await _db.LeadFollowUps.AsNoTracking()
            .Where(f => f.CustomerId == customerId)
            .OrderBy(f => f.Status)
            .ThenBy(f => f.Status == LeadFollowUpStatus.Pending ? f.DueAt : DateTime.MinValue)
            .ThenByDescending(f => f.DueAt)
            .Take(50)
            .Select(f => new LeadFollowUpDto
            {
                Id = f.Id,
                CustomerId = f.CustomerId,
                DueAt = f.DueAt,
                Channel = f.Channel.ToString(),
                Note = f.Note,
                Status = f.Status.ToString(),
                AssignedToUserId = f.AssignedToUserId,
                AssignedToName = f.AssignedToUserId == null
                    ? null
                    : _db.Users.Where(u => u.Id == f.AssignedToUserId)
                        .Select(u => u.FullName).FirstOrDefault(),
                CompletedAt = f.CompletedAt
            })
            .ToListAsync(ct);

        var interactions = await _db.CustomerInteractions.AsNoTracking()
            .Where(i => i.CustomerId == customerId)
            .OrderByDescending(i => i.OccurredAt)
            .Take(100)
            .Select(i => new LeadInteractionDto
            {
                Id = i.Id,
                Type = i.Type.ToString(),
                OccurredAt = i.OccurredAt,
                Summary = i.Summary,
                AuthorUserId = i.AuthorUserId,
                AuthorName = _db.Users.Where(u => u.Id == i.AuthorUserId)
                    .Select(u => u.FullName).FirstOrDefault()
            })
            .ToListAsync(ct);

        var assignedToName = profile?.AssignedToUserId is { } assignee
            ? await _db.Users.Where(u => u.Id == assignee).Select(u => u.FullName).FirstOrDefaultAsync(ct)
            : null;

        return new LeadDetailDto
        {
            CustomerId = customer.Id,
            FullName = customer.FullName,
            HasProfile = profile != null,
            Stage = (profile?.Stage ?? LeadStage.New).ToString(),
            StageChangedAt = profile?.StageChangedAt ?? DateTime.UtcNow,
            Source = (profile?.Source ?? LeadSource.Unknown).ToString(),
            SourceDetail = profile?.SourceDetail,
            AssignedToUserId = profile?.AssignedToUserId,
            AssignedToName = assignedToName,
            InterestSummary = profile?.InterestSummary,
            LostReason = profile?.LostReason,
            FollowUps = followUps,
            Interactions = interactions
        };
    }

    public async Task<LeadDetailDto> UpdateAsync(Guid customerId, UpdateLeadRequestDto request, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == customerId, ct)
            ?? throw new KeyNotFoundException($"Customer {customerId} not found.");

        var profile = await GetOrCreateProfileAsync(customer, ct);

        var stage = Enum.Parse<LeadStage>(request.Stage, ignoreCase: true);
        if (stage != profile.Stage)
        {
            profile.Stage = stage;
            profile.StageChangedAt = DateTime.UtcNow;
        }

        profile.Source = Enum.Parse<LeadSource>(request.Source, ignoreCase: true);
        profile.SourceDetail = Normalize(request.SourceDetail);
        profile.AssignedToUserId = request.AssignedToUserId;
        profile.InterestSummary = Normalize(request.InterestSummary);
        profile.LostReason = stage == LeadStage.Lost ? Normalize(request.LostReason) : null;

        SyncCustomerStatus(customer, stage,
            hasVehicles: await _db.Vehicles.AnyAsync(v => v.CustomerId == customerId, ct));

        await _db.SaveChangesAsync(ct);
        return await GetAsync(customerId, ct);
    }

    /// <summary>
    /// Keeps Customer.Status coherent with the pipeline: Won → Active,
    /// Lost → Lost, non-terminal → Prospect (unless the customer already owns a
    /// vehicle — an existing customer worked for a new sale stays Active).
    /// </summary>
    private static void SyncCustomerStatus(Customer customer, LeadStage stage, bool hasVehicles)
    {
        customer.Status = stage switch
        {
            LeadStage.Won => CustomerStatus.Active,
            LeadStage.Lost => hasVehicles ? customer.Status : CustomerStatus.Lost,
            _ => hasVehicles ? customer.Status : CustomerStatus.Prospect
        };
    }

    private async Task<LeadProfile> GetOrCreateProfileAsync(Customer customer, CancellationToken ct)
    {
        var profile = await _db.LeadProfiles.FirstOrDefaultAsync(l => l.CustomerId == customer.Id, ct);
        if (profile != null) return profile;

        profile = new LeadProfile
        {
            OrganizationId = customer.OrganizationId,
            CustomerId = customer.Id
        };
        _db.LeadProfiles.Add(profile);
        return profile;
    }

    // ── Relances ─────────────────────────────────────────────────────────────

    public async Task<LeadFollowUpDto> AddFollowUpAsync(Guid customerId, CreateLeadFollowUpRequestDto request, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == customerId, ct)
            ?? throw new KeyNotFoundException($"Customer {customerId} not found.");

        var profile = await GetOrCreateProfileAsync(customer, ct);

        var followUp = new LeadFollowUp
        {
            OrganizationId = customer.OrganizationId,
            CustomerId = customerId,
            DueAt = request.DueAt.ToUniversalTime(),
            Channel = Enum.Parse<CustomerInteractionType>(request.Channel, ignoreCase: true),
            Note = Normalize(request.Note),
            AssignedToUserId = request.AssignedToUserId
        };
        _db.LeadFollowUps.Add(followUp);

        if (profile.NextFollowUpAt is null || followUp.DueAt < profile.NextFollowUpAt)
            profile.NextFollowUpAt = followUp.DueAt;

        await _db.SaveChangesAsync(ct);
        return await MapFollowUpAsync(followUp, ct);
    }

    public async Task<LeadFollowUpDto> CompleteFollowUpAsync(Guid followUpId, CompleteLeadFollowUpRequestDto request, CancellationToken ct = default)
    {
        var followUp = await _db.LeadFollowUps.FirstOrDefaultAsync(f => f.Id == followUpId, ct)
            ?? throw new KeyNotFoundException($"Follow-up {followUpId} not found.");

        if (followUp.Status != LeadFollowUpStatus.Pending)
            throw new ConflictException("Cette relance est déjà terminée ou annulée.");

        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Active user is required.");

        followUp.Status = LeadFollowUpStatus.Done;
        followUp.CompletedAt = DateTime.UtcNow;
        followUp.CompletedByUserId = userId;

        var summary = Normalize(request.InteractionSummary);
        if (summary != null)
        {
            _db.CustomerInteractions.Add(new CustomerInteraction
            {
                OrganizationId = followUp.OrganizationId,
                CustomerId = followUp.CustomerId,
                Type = followUp.Channel,
                OccurredAt = DateTime.UtcNow,
                Summary = summary,
                AuthorUserId = userId
            });
        }

        await RecomputeNextFollowUpAsync(followUp.CustomerId, excludeId: followUp.Id, ct);
        await _db.SaveChangesAsync(ct);
        return await MapFollowUpAsync(followUp, ct);
    }

    public async Task<LeadFollowUpDto> CancelFollowUpAsync(Guid followUpId, CancellationToken ct = default)
    {
        var followUp = await _db.LeadFollowUps.FirstOrDefaultAsync(f => f.Id == followUpId, ct)
            ?? throw new KeyNotFoundException($"Follow-up {followUpId} not found.");

        if (followUp.Status != LeadFollowUpStatus.Pending)
            throw new ConflictException("Cette relance est déjà terminée ou annulée.");

        followUp.Status = LeadFollowUpStatus.Cancelled;

        await RecomputeNextFollowUpAsync(followUp.CustomerId, excludeId: followUp.Id, ct);
        await _db.SaveChangesAsync(ct);
        return await MapFollowUpAsync(followUp, ct);
    }

    private async Task RecomputeNextFollowUpAsync(Guid customerId, Guid excludeId, CancellationToken ct)
    {
        var profile = await _db.LeadProfiles.FirstOrDefaultAsync(l => l.CustomerId == customerId, ct);
        if (profile is null) return;

        profile.NextFollowUpAt = await _db.LeadFollowUps
            .Where(f => f.CustomerId == customerId
                && f.Id != excludeId
                && f.Status == LeadFollowUpStatus.Pending)
            .MinAsync(f => (DateTime?)f.DueAt, ct);
    }

    private async Task<LeadFollowUpDto> MapFollowUpAsync(LeadFollowUp f, CancellationToken ct)
    {
        var assignedToName = f.AssignedToUserId is { } assignee
            ? await _db.Users.Where(u => u.Id == assignee).Select(u => u.FullName).FirstOrDefaultAsync(ct)
            : null;

        return new LeadFollowUpDto
        {
            Id = f.Id,
            CustomerId = f.CustomerId,
            DueAt = f.DueAt,
            Channel = f.Channel.ToString(),
            Note = f.Note,
            Status = f.Status.ToString(),
            AssignedToUserId = f.AssignedToUserId,
            AssignedToName = assignedToName,
            CompletedAt = f.CompletedAt
        };
    }

    // ── Doublons & fusion ────────────────────────────────────────────────────

    public async Task<LeadDuplicatesResponseDto> FindDuplicatesAsync(CancellationToken ct = default)
    {
        var phoneGroups = await _db.Customers.AsNoTracking()
            .Where(c => c.Phone != null)
            .GroupBy(c => c.Phone!)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToListAsync(ct);

        var emailGroups = await _db.Customers.AsNoTracking()
            .Where(c => c.Email != null)
            .GroupBy(c => c.Email!.ToLower())
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToListAsync(ct);

        var groups = new List<LeadDuplicateGroupDto>();
        var pairedIds = new HashSet<string>();

        foreach (var phone in phoneGroups)
        {
            var members = await LoadDuplicateCustomersAsync(c => c.Phone == phone, ct);
            if (RegisterGroup(pairedIds, members))
                groups.Add(new LeadDuplicateGroupDto { MatchType = "Phone", Value = phone, Customers = members });
        }

        foreach (var email in emailGroups)
        {
            var members = await LoadDuplicateCustomersAsync(c => c.Email != null && c.Email.ToLower() == email, ct);
            // Skip groups already fully covered by a phone group.
            if (RegisterGroup(pairedIds, members))
                groups.Add(new LeadDuplicateGroupDto { MatchType = "Email", Value = email, Customers = members });
        }

        return new LeadDuplicatesResponseDto { Groups = groups };
    }

    /// <summary>Dedups overlapping groups: only keeps a group introducing a new pair.</summary>
    private static bool RegisterGroup(HashSet<string> pairedIds, List<LeadDuplicateCustomerDto> members)
    {
        if (members.Count < 2) return false;
        var ids = members.Select(m => m.Id).OrderBy(i => i).ToArray();
        var key = string.Join("|", ids);
        return pairedIds.Add(key);
    }

    private async Task<List<LeadDuplicateCustomerDto>> LoadDuplicateCustomersAsync(
        System.Linq.Expressions.Expression<Func<Customer, bool>> predicate,
        CancellationToken ct)
    {
        return await _db.Customers.AsNoTracking()
            .Where(predicate)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new LeadDuplicateCustomerDto
            {
                Id = c.Id,
                FullName = c.FullName,
                Email = c.Email,
                Phone = c.Phone,
                Address = c.Address,
                City = c.City,
                PostalCode = c.PostalCode,
                Notes = c.Notes,
                Status = c.Status.ToString(),
                Tags = c.Tags,
                VehicleCount = _db.Vehicles.Count(v => v.CustomerId == c.Id),
                InteractionCount = _db.CustomerInteractions.Count(i => i.CustomerId == c.Id),
                CreatedAt = c.CreatedAt
            })
            .ToListAsync(ct);
    }

    public async Task<MergeCustomersResponseDto> MergeAsync(MergeCustomersRequestDto request, CancellationToken ct = default)
    {
        if (request.PrimaryCustomerId == request.DuplicateCustomerId)
            throw new ConflictException("Impossible de fusionner une fiche avec elle-même.");

        var primary = await _db.Customers.FirstOrDefaultAsync(c => c.Id == request.PrimaryCustomerId, ct)
            ?? throw new KeyNotFoundException($"Customer {request.PrimaryCustomerId} not found.");
        var duplicate = await _db.Customers.FirstOrDefaultAsync(c => c.Id == request.DuplicateCustomerId, ct)
            ?? throw new KeyNotFoundException($"Customer {request.DuplicateCustomerId} not found.");

        // Fill the primary's gaps with the duplicate's data — never overwrite.
        primary.Email ??= duplicate.Email;
        primary.Phone ??= duplicate.Phone;
        primary.Address ??= duplicate.Address;
        primary.City ??= duplicate.City;
        primary.PostalCode ??= duplicate.PostalCode;
        primary.ExternalRef ??= duplicate.ExternalRef;
        if (duplicate.Notes != null)
            primary.Notes = primary.Notes is null ? duplicate.Notes : $"{primary.Notes}\n---\n{duplicate.Notes}";
        primary.Tags = primary.Tags.Union(duplicate.Tags, StringComparer.OrdinalIgnoreCase).ToArray();
        if (duplicate.AcquiredAt < primary.AcquiredAt) primary.AcquiredAt = duplicate.AcquiredAt;

        // Move every customer-linked record to the primary.
        var vehicles = await _db.Vehicles.Where(v => v.CustomerId == duplicate.Id).ToListAsync(ct);
        vehicles.ForEach(v => v.CustomerId = primary.Id);

        var interactions = await _db.CustomerInteractions.Where(i => i.CustomerId == duplicate.Id).ToListAsync(ct);
        interactions.ForEach(i => i.CustomerId = primary.Id);

        var appointments = await _db.Appointments.Where(a => a.CustomerId == duplicate.Id).ToListAsync(ct);
        appointments.ForEach(a => a.CustomerId = primary.Id);

        var followUps = await _db.LeadFollowUps.Where(f => f.CustomerId == duplicate.Id).ToListAsync(ct);
        followUps.ForEach(f => f.CustomerId = primary.Id);

        var reminders = await _db.Reminders.Where(r => r.CustomerId == duplicate.Id).ToListAsync(ct);
        reminders.ForEach(r => r.CustomerId = primary.Id);

        var timelineEvents = await _db.TimelineEvents.Where(t => t.CustomerId == duplicate.Id).ToListAsync(ct);
        timelineEvents.ForEach(t => t.CustomerId = primary.Id);

        var notifications = await _db.Notifications.Where(n => n.CustomerId == duplicate.Id).ToListAsync(ct);
        notifications.ForEach(n => n.CustomerId = primary.Id);

        var messageLogs = await _db.MessageLogs.Where(m => m.CustomerId == duplicate.Id).ToListAsync(ct);
        messageLogs.ForEach(m => m.CustomerId = primary.Id);

        var leasingContracts = await _db.LeasingContracts.Where(l => l.CustomerId == duplicate.Id).ToListAsync(ct);
        leasingContracts.ForEach(l => l.CustomerId = primary.Id);

        // Merge lead profiles: the primary's profile wins field by field.
        var primaryProfile = await _db.LeadProfiles.FirstOrDefaultAsync(l => l.CustomerId == primary.Id, ct);
        var duplicateProfile = await _db.LeadProfiles.FirstOrDefaultAsync(l => l.CustomerId == duplicate.Id, ct);
        if (duplicateProfile != null)
        {
            if (primaryProfile is null)
            {
                duplicateProfile.CustomerId = primary.Id;
                primaryProfile = duplicateProfile;
            }
            else
            {
                primaryProfile.SourceDetail ??= duplicateProfile.SourceDetail;
                primaryProfile.InterestSummary ??= duplicateProfile.InterestSummary;
                primaryProfile.AssignedToUserId ??= duplicateProfile.AssignedToUserId;
                if (primaryProfile.Source == LeadSource.Unknown)
                    primaryProfile.Source = duplicateProfile.Source;
                _db.LeadProfiles.Remove(duplicateProfile);
            }
        }

        if (primaryProfile != null)
        {
            primaryProfile.NextFollowUpAt = await _db.LeadFollowUps
                .Where(f => (f.CustomerId == primary.Id || f.CustomerId == duplicate.Id)
                    && f.Status == LeadFollowUpStatus.Pending)
                .MinAsync(f => (DateTime?)f.DueAt, ct);
        }

        // If the surviving record now owns vehicles, it's a real customer.
        if (primary.Status == CustomerStatus.Prospect && vehicles.Count > 0)
            primary.Status = CustomerStatus.Active;

        duplicate.MergedIntoCustomerId = primary.Id;
        _db.Customers.Remove(duplicate); // soft delete via interceptor

        await _db.SaveChangesAsync(ct);

        return new MergeCustomersResponseDto
        {
            PrimaryCustomerId = primary.Id,
            MovedVehicles = vehicles.Count,
            MovedInteractions = interactions.Count,
            MovedAppointments = appointments.Count,
            MovedFollowUps = followUps.Count,
            MovedOther = reminders.Count + timelineEvents.Count + notifications.Count
                + messageLogs.Count + leasingContracts.Count
        };
    }

    // ── Import de masse ──────────────────────────────────────────────────────

    public async Task<LeadImportResultDto> ImportAsync(LeadImportRequestDto request, CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");

        var orgCountryCode = await _db.Organizations
            .IgnoreQueryFilters().AsNoTracking()
            .Where(o => o.Id == orgId && o.DeletedAt == null)
            .Select(o => o.PhoneCountryCode)
            .FirstOrDefaultAsync(ct);

        var defaultSource = Enum.TryParse<LeadSource>(request.DefaultSource, ignoreCase: true, out var ds)
            ? ds
            : LeadSource.Import;

        // Pre-normalise every row once.
        var rows = request.Rows.Select((r, idx) => new
        {
            Index = idx + 1,
            Raw = r,
            ExternalRef = Normalize(r.ExternalRef),
            FullName = Normalize(r.FullName),
            Phone = string.IsNullOrWhiteSpace(r.Phone)
                ? null
                : PhoneNormalizer.Normalize(r.Phone, orgCountryCode) ?? r.Phone.Trim(),
            Email = Normalize(r.Email)?.ToLowerInvariant()
        }).ToList();

        // One round-trip: fetch all potentially matching customers.
        var refs = rows.Where(r => r.ExternalRef != null).Select(r => r.ExternalRef!).Distinct().ToList();
        var phones = rows.Where(r => r.Phone != null).Select(r => r.Phone!).Distinct().ToList();
        var emails = rows.Where(r => r.Email != null).Select(r => r.Email!).Distinct().ToList();

        var candidates = await _db.Customers
            .Where(c =>
                (c.ExternalRef != null && refs.Contains(c.ExternalRef))
                || (c.Phone != null && phones.Contains(c.Phone))
                || (c.Email != null && emails.Contains(c.Email.ToLower())))
            .ToListAsync(ct);

        var byRef = candidates.Where(c => c.ExternalRef != null)
            .GroupBy(c => c.ExternalRef!).ToDictionary(g => g.Key, g => g.First());
        var byPhone = candidates.Where(c => c.Phone != null)
            .GroupBy(c => c.Phone!).ToDictionary(g => g.Key, g => g.First());
        var byEmail = candidates.Where(c => c.Email != null)
            .GroupBy(c => c.Email!.ToLowerInvariant()).ToDictionary(g => g.Key, g => g.First());

        var result = new LeadImportResultDto { DryRun = request.DryRun, TotalRows = rows.Count };
        var seenRefs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenPhones = new HashSet<string>();
        var seenEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in rows)
        {
            var rowResult = new LeadImportRowResultDto { Row = row.Index, FullName = row.FullName ?? "" };
            result.Rows.Add(rowResult);

            if (row.FullName is null || row.FullName.Length < 2)
            {
                Fail(result, rowResult, "Nom manquant ou trop court.");
                continue;
            }

            // Identity requirement: without a strong key the row could never be
            // re-imported without duplicating — refuse rather than guess by name.
            if (row.ExternalRef is null && row.Phone is null && row.Email is null)
            {
                Fail(result, rowResult, "Aucun identifiant fiable (référence, téléphone ou email).");
                continue;
            }

            // In-file duplicates.
            if ((row.ExternalRef != null && !seenRefs.Add(row.ExternalRef))
                || (row.Phone != null && !seenPhones.Add(row.Phone))
                || (row.Email != null && !seenEmails.Add(row.Email)))
            {
                result.Skipped++;
                rowResult.Action = "Skipped";
                rowResult.Message = "Doublon à l'intérieur du fichier.";
                continue;
            }

            // Match priority: external ref, then phone, then email.
            Customer? match = null;
            if (row.ExternalRef != null && byRef.TryGetValue(row.ExternalRef, out var m1))
            {
                match = m1;
                rowResult.MatchedBy = "ExternalRef";
            }
            else if (row.Phone != null && byPhone.TryGetValue(row.Phone, out var m2))
            {
                match = m2;
                rowResult.MatchedBy = "Phone";
            }
            else if (row.Email != null && byEmail.TryGetValue(row.Email, out var m3))
            {
                match = m3;
                rowResult.MatchedBy = "Email";
            }

            if (match != null)
            {
                var changed = FillMissing(match, row.Raw, row.ExternalRef, row.Phone, Normalize(row.Raw.Email));
                rowResult.CustomerId = match.Id;
                if (changed)
                {
                    result.Updated++;
                    rowResult.Action = "Updated";
                    rowResult.Message = "Champs manquants complétés.";
                }
                else
                {
                    result.Skipped++;
                    rowResult.Action = "Skipped";
                    rowResult.Message = "Déjà présent, aucune donnée nouvelle.";
                }
                continue;
            }

            var customer = new Customer
            {
                OrganizationId = orgId,
                FullName = row.FullName,
                Email = Normalize(row.Raw.Email),
                Phone = row.Phone,
                Address = Normalize(row.Raw.Address),
                City = Normalize(row.Raw.City),
                PostalCode = Normalize(row.Raw.PostalCode),
                Notes = Normalize(row.Raw.Notes),
                Tags = row.Raw.Tags ?? Array.Empty<string>(),
                ExternalRef = row.ExternalRef,
                Status = CustomerStatus.Prospect,
                AcquiredAt = DateTime.UtcNow
            };

            var rowSource = Enum.TryParse<LeadSource>(row.Raw.Source, ignoreCase: true, out var rs)
                ? rs
                : defaultSource;

            var profile = new LeadProfile
            {
                OrganizationId = orgId,
                CustomerId = customer.Id,
                Source = rowSource,
                SourceDetail = Normalize(row.Raw.SourceDetail),
                InterestSummary = Normalize(row.Raw.InterestSummary)
            };

            if (!request.DryRun)
            {
                _db.Customers.Add(customer);
                _db.LeadProfiles.Add(profile);
                // Make the new row matchable by the rest of the file.
                if (row.ExternalRef != null) byRef[row.ExternalRef] = customer;
                if (row.Phone != null) byPhone[row.Phone] = customer;
                if (row.Email != null) byEmail[row.Email] = customer;
                rowResult.CustomerId = customer.Id;
            }

            result.Created++;
            rowResult.Action = "Created";
        }

        if (!request.DryRun)
        {
            _db.LeadImportBatches.Add(new LeadImportBatch
            {
                OrganizationId = orgId,
                FileName = string.IsNullOrWhiteSpace(request.FileName) ? "import.csv" : request.FileName.Trim(),
                TotalRows = result.TotalRows,
                CreatedCount = result.Created,
                UpdatedCount = result.Updated,
                SkippedCount = result.Skipped,
                ErrorCount = result.Errors,
                ReportJson = JsonSerializer.Serialize(result.Rows, ReportJsonOptions)
            });
            await _db.SaveChangesAsync(ct);
        }

        return result;
    }

    private static void Fail(LeadImportResultDto result, LeadImportRowResultDto row, string message)
    {
        result.Errors++;
        row.Action = "Error";
        row.Message = message;
    }

    /// <summary>Completes empty fields of an existing customer; returns true when something changed.</summary>
    private static bool FillMissing(Customer customer, LeadImportRowDto row, string? externalRef, string? phone, string? email)
    {
        var changed = false;

        bool Set(string? current, string? incoming, Action<string> apply)
        {
            if (current != null || incoming is null) return false;
            apply(incoming);
            return true;
        }

        changed |= Set(customer.ExternalRef, externalRef, v => customer.ExternalRef = v);
        changed |= Set(customer.Email, email, v => customer.Email = v);
        changed |= Set(customer.Phone, phone, v => customer.Phone = v);
        changed |= Set(customer.Address, Normalize(row.Address), v => customer.Address = v);
        changed |= Set(customer.City, Normalize(row.City), v => customer.City = v);
        changed |= Set(customer.PostalCode, Normalize(row.PostalCode), v => customer.PostalCode = v);
        changed |= Set(customer.Notes, Normalize(row.Notes), v => customer.Notes = v);

        if (row.Tags is { Length: > 0 })
        {
            var merged = customer.Tags.Union(row.Tags, StringComparer.OrdinalIgnoreCase).ToArray();
            if (merged.Length != customer.Tags.Length)
            {
                customer.Tags = merged;
                changed = true;
            }
        }

        return changed;
    }

    // ── Statistiques ─────────────────────────────────────────────────────────

    /// <summary>In-memory projection of one lead, shared by every aggregation below.</summary>
    private sealed record LeadStatRow(
        Guid CustomerId,
        DateTime CreatedAt,
        LeadStage Stage,
        DateTime StageChangedAt,
        LeadSource Source,
        string[] Tags,
        Guid? AssignedToUserId,
        string? LostReason,
        DateTime? NextFollowUpAt);

    public async Task<LeadStatsResponseDto> GetStatsAsync(LeadStatsRequestDto request, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var to = request.To?.ToUniversalTime() ?? now;
        var from = request.From?.ToUniversalTime() ?? to.AddDays(-30);
        if (from > to) (from, to) = (to, from);
        var periodLength = to - from;
        var prevFrom = from - periodLength;

        // One round-trip for every lead of the org; aggregation happens in
        // memory (a garage's lead book is small, and half the metrics need
        // arbitrary tag/date slicing that SQL grouping would triplicate).
        var allLeads = await (
            from c in _db.Customers.AsNoTracking()
            join lp in _db.LeadProfiles.AsNoTracking() on c.Id equals lp.CustomerId into lps
            from lp in lps.DefaultIfEmpty()
            where c.Status == CustomerStatus.Prospect || lp != null
            select new
            {
                c.Id,
                c.CreatedAt,
                c.Tags,
                Profile = lp
            })
            .ToListAsync(ct);

        var leads = allLeads
            .Select(x => new LeadStatRow(
                x.Id,
                x.CreatedAt,
                x.Profile?.Stage ?? LeadStage.New,
                x.Profile?.StageChangedAt ?? x.CreatedAt,
                x.Profile?.Source ?? LeadSource.Unknown,
                x.Tags,
                x.Profile?.AssignedToUserId,
                x.Profile?.LostReason,
                x.Profile?.NextFollowUpAt))
            .ToList();

        var availableTags = leads
            .SelectMany(l => l.Tags)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(t => t, StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Dimension filters restrict the population everywhere.
        if (Enum.TryParse<LeadSource>(request.Source, ignoreCase: true, out var sourceFilter))
            leads = leads.Where(l => l.Source == sourceFilter).ToList();
        if (!string.IsNullOrWhiteSpace(request.Tag))
            leads = leads.Where(l => l.Tags.Contains(request.Tag.Trim(), StringComparer.OrdinalIgnoreCase)).ToList();
        if (request.AssignedToUserId is { } assignee)
            leads = leads.Where(l => l.AssignedToUserId == assignee).ToList();

        var leadIds = leads.Select(l => l.CustomerId).ToHashSet();

        var interactions = await _db.CustomerInteractions.AsNoTracking()
            .Where(i => i.OccurredAt >= prevFrom && i.OccurredAt <= to)
            .Select(i => new { i.CustomerId, i.OccurredAt, i.AuthorUserId })
            .ToListAsync(ct);
        interactions = interactions.Where(i => leadIds.Contains(i.CustomerId)).ToList();

        var followUps = await _db.LeadFollowUps.AsNoTracking()
            .Select(f => new { f.CustomerId, f.Status, f.DueAt, f.CompletedAt, f.AssignedToUserId })
            .ToListAsync(ct);
        followUps = followUps.Where(f => leadIds.Contains(f.CustomerId)).ToList();

        bool InPeriod(DateTime d) => d >= from && d <= to;
        bool InPrev(DateTime d) => d >= prevFrom && d < from;

        var wonInPeriod = leads.Where(l => l.Stage == LeadStage.Won && InPeriod(l.StageChangedAt)).ToList();
        var lostInPeriod = leads.Where(l => l.Stage == LeadStage.Lost && InPeriod(l.StageChangedAt)).ToList();
        var wonPrev = leads.Count(l => l.Stage == LeadStage.Won && InPrev(l.StageChangedAt));
        var lostPrev = leads.Count(l => l.Stage == LeadStage.Lost && InPrev(l.StageChangedAt));
        var avgPrevDays = leads
            .Where(l => l.Stage == LeadStage.Won && InPrev(l.StageChangedAt))
            .Select(l => (l.StageChangedAt - l.CreatedAt).TotalDays)
            .DefaultIfEmpty()
            .Average();

        static bool IsOpen(LeadStage s) => s != LeadStage.Won && s != LeadStage.Lost;

        var kpis = new LeadStatsKpisDto
        {
            NewLeads = leads.Count(l => InPeriod(l.CreatedAt)),
            NewLeadsPrev = leads.Count(l => InPrev(l.CreatedAt)),
            Won = wonInPeriod.Count,
            WonPrev = wonPrev,
            Lost = lostInPeriod.Count,
            LostPrev = lostPrev,
            ConversionRate = wonInPeriod.Count + lostInPeriod.Count == 0
                ? null
                : (double)wonInPeriod.Count / (wonInPeriod.Count + lostInPeriod.Count),
            ConversionRatePrev = wonPrev + lostPrev == 0
                ? null
                : (double)wonPrev / (wonPrev + lostPrev),
            AvgDaysToConvert = wonInPeriod.Count == 0
                ? null
                : wonInPeriod.Average(l => (l.StageChangedAt - l.CreatedAt).TotalDays),
            AvgDaysToConvertPrev = wonPrev == 0 ? null : avgPrevDays,
            Interactions = interactions.Count(i => InPeriod(i.OccurredAt)),
            InteractionsPrev = interactions.Count(i => InPrev(i.OccurredAt)),
            FollowUpsCompleted = followUps.Count(f => f.CompletedAt is { } d && InPeriod(d)),
            FollowUpsCompletedPrev = followUps.Count(f => f.CompletedAt is { } d && InPrev(d)),
            OpenPipeline = leads.Count(l => IsOpen(l.Stage)),
            OverdueFollowUps = followUps.Count(f => f.Status == LeadFollowUpStatus.Pending && f.DueAt < now)
        };

        // ── Timeline ─────────────────────────────────────────────────────────
        var granularity = periodLength.TotalDays <= 31 ? "day"
            : periodLength.TotalDays <= 190 ? "week"
            : "month";

        DateTime Bucket(DateTime d) => granularity switch
        {
            "day" => d.Date,
            "week" => d.Date.AddDays(-(((int)d.DayOfWeek + 6) % 7)), // Monday
            _ => new DateTime(d.Year, d.Month, 1, 0, 0, 0, DateTimeKind.Utc)
        };

        var buckets = new SortedDictionary<DateTime, LeadStatsTimePointDto>();
        for (var d = Bucket(from); d <= to; d = granularity switch
        {
            "day" => d.AddDays(1),
            "week" => d.AddDays(7),
            _ => d.AddMonths(1)
        })
        {
            buckets[d] = new LeadStatsTimePointDto { Period = d };
        }

        void Bump(DateTime when, Action<LeadStatsTimePointDto> apply)
        {
            if (!InPeriod(when)) return;
            if (buckets.TryGetValue(Bucket(when), out var point)) apply(point);
        }

        foreach (var l in leads)
        {
            Bump(l.CreatedAt, p => p.NewLeads++);
            if (l.Stage == LeadStage.Won) Bump(l.StageChangedAt, p => p.Won++);
            if (l.Stage == LeadStage.Lost) Bump(l.StageChangedAt, p => p.Lost++);
        }
        foreach (var i in interactions) Bump(i.OccurredAt, p => p.Interactions++);

        // ── Cohorte de la période : funnel + répartitions campagne/source ────
        var cohort = leads.Where(l => InPeriod(l.CreatedAt)).ToList();

        var funnelStages = new[]
        {
            LeadStage.New, LeadStage.Contacted, LeadStage.Qualified,
            LeadStage.AppointmentScheduled, LeadStage.Won
        };
        var funnel = funnelStages
            .Select(stage => new LeadStatsFunnelStepDto
            {
                Stage = stage.ToString(),
                // Linear pipeline: current stage >= X means the lead passed X.
                // Lost leads are excluded (their reached-stage isn't recorded).
                Count = cohort.Count(l => l.Stage != LeadStage.Lost && l.Stage >= stage)
            })
            .ToList();

        static LeadStatsBreakdownDto ToBreakdown(string key, IEnumerable<LeadStatRow> rows)
        {
            var list = rows.ToList();
            return new LeadStatsBreakdownDto
            {
                Key = key,
                Created = list.Count,
                Won = list.Count(l => l.Stage == LeadStage.Won),
                Lost = list.Count(l => l.Stage == LeadStage.Lost),
                Open = list.Count(l => IsOpen(l.Stage))
            };
        }

        var bySource = cohort
            .GroupBy(l => l.Source)
            .Select(g => ToBreakdown(g.Key.ToString(), g))
            .OrderByDescending(b => b.Created)
            .ToList();

        var byTag = cohort
            .SelectMany(l => l.Tags.Select(t => (Tag: t, Lead: l)))
            .GroupBy(x => x.Tag, StringComparer.OrdinalIgnoreCase)
            .Select(g => ToBreakdown(g.Key, g.Select(x => x.Lead)))
            .OrderByDescending(b => b.Created)
            .Take(12)
            .ToList();

        // ── Vendeurs (lentille activité) ─────────────────────────────────────
        var userIds = leads.Where(l => l.AssignedToUserId != null).Select(l => l.AssignedToUserId!.Value)
            .Concat(interactions.Where(i => InPeriod(i.OccurredAt)).Select(i => i.AuthorUserId))
            .Distinct()
            .ToList();

        var userNames = await _db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName })
            .ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

        var byUser = userIds
            .Select(id => new LeadStatsUserDto
            {
                UserId = id,
                Name = userNames.TryGetValue(id, out var n) ? n : "?",
                Won = leads.Count(l => l.AssignedToUserId == id && l.Stage == LeadStage.Won && InPeriod(l.StageChangedAt)),
                Open = leads.Count(l => l.AssignedToUserId == id && IsOpen(l.Stage)),
                OverdueFollowUps = followUps.Count(f => f.AssignedToUserId == id
                    && f.Status == LeadFollowUpStatus.Pending && f.DueAt < now),
                Interactions = interactions.Count(i => i.AuthorUserId == id && InPeriod(i.OccurredAt))
            })
            .Where(u => u.Won + u.Open + u.OverdueFollowUps + u.Interactions > 0)
            .OrderByDescending(u => u.Won)
            .ThenByDescending(u => u.Interactions)
            .ToList();

        var lostReasons = lostInPeriod
            .GroupBy(l => Normalize(l.LostReason) ?? "Non renseignée", StringComparer.OrdinalIgnoreCase)
            .Select(g => new LeadStatsLostReasonDto { Reason = g.Key, Count = g.Count() })
            .OrderByDescending(r => r.Count)
            .Take(10)
            .ToList();

        return new LeadStatsResponseDto
        {
            From = from,
            To = to,
            Granularity = granularity,
            Kpis = kpis,
            Timeline = buckets.Values.ToList(),
            Funnel = funnel,
            BySource = bySource,
            ByTag = byTag,
            ByUser = byUser,
            LostReasons = lostReasons,
            AvailableTags = availableTags
        };
    }

    // ── Équipe ───────────────────────────────────────────────────────────────

    public async Task<List<LeadTeamMemberDto>> GetTeamAsync(CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Active organization is required.");

        return await (
            from uo in _db.UserOrganizations.AsNoTracking()
            join u in _db.Users.AsNoTracking() on uo.UserId equals u.Id
            where uo.OrganizationId == orgId
            orderby u.FullName
            select new LeadTeamMemberDto
            {
                UserId = u.Id,
                FullName = u.FullName,
                Role = uo.Role.ToString()
            }).ToListAsync(ct);
    }

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
