using System.Globalization;
using System.Text;
using CarHorizontal.Api.Common;
using CarHorizontal.Api.Modules.Sales.Dtos;
using CarHorizontal.Domain.Entities.Customers;
using CarHorizontal.Domain.Entities.Leads;
using CarHorizontal.Domain.Entities.Sales;
using CarHorizontal.Domain.Entities.Vehicles;
using CarHorizontal.Domain.Files;
using CarHorizontal.Domain.Sales;
using CarHorizontal.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CarHorizontal.Api.Modules.Sales;

public class SaleService : ISaleService
{
    /// <summary>Plus grand côté conservé pour une photo d'annonce.</summary>
    private const int PhotoMaxDimension = 1920;

    /// <summary>Qualité JPEG des photos : compromis usuel poids/rendu pour une annonce.</summary>
    private const int PhotoQuality = 80;

    private const int ThumbnailMaxDimension = 480;
    private const int ThumbnailQuality = 70;

    private const string PhotoFolder = "Annonces";

    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IFileStorage _files;
    private readonly IImageProcessor _images;

    public SaleService(
        AppDbContext db,
        ICurrentUserService currentUser,
        IFileStorage files,
        IImageProcessor images)
    {
        _db = db;
        _currentUser = currentUser;
        _files = files;
        _images = images;
    }

    // --- Lecture --------------------------------------------------------

    public async Task<SaleDossierDto> GetDossierAsync(Guid vehicleId, CancellationToken ct = default)
    {
        var vehicle = await _db.Vehicles.AsNoTracking().FirstOrDefaultAsync(v => v.Id == vehicleId, ct)
            ?? throw new KeyNotFoundException($"Véhicule {vehicleId} introuvable.");

        var listing = await _db.VehicleSaleListings.AsNoTracking()
            .FirstOrDefaultAsync(l => l.VehicleId == vehicleId, ct);

        var registration = await _db.VehicleRegistrationDetails.AsNoTracking()
            .FirstOrDefaultAsync(r => r.VehicleId == vehicleId, ct);

        var dossier = new SaleDossierDto
        {
            VehicleId = vehicle.Id,
            VehicleLabel = $"{vehicle.Make} {vehicle.Model}".Trim(),
            LicensePlate = vehicle.LicensePlate,
            CurrentMileage = vehicle.CurrentMileage,
            Registration = registration is null ? null : MapRegistration(registration),
            RegistrationReadiness = BuildReadiness(vehicle, registration)
        };

        if (listing is null) return dossier;

        var priceChanges = await _db.VehicleSalePriceChanges.AsNoTracking()
            .Where(p => p.ListingId == listing.Id)
            .OrderBy(p => p.ChangedAt)
            .ToListAsync(ct);

        var posts = await _db.VehicleSaleChannelPosts.AsNoTracking()
            .Where(c => c.ListingId == listing.Id)
            .OrderBy(c => c.Channel)
            .ToListAsync(ct);

        var photos = await _db.VehicleSalePhotos.AsNoTracking()
            .Where(p => p.ListingId == listing.Id)
            .OrderBy(p => p.SortOrder)
            .ToListAsync(ct);

        var inquiries = await _db.VehicleSaleInquiries.AsNoTracking()
            .Where(i => i.ListingId == listing.Id)
            .OrderByDescending(i => i.ReceivedAt)
            .ToListAsync(ct);

        // Une seule requête clients pour l'acheteur du véhicule et tous les contacts :
        // l'identité des contacts n'est pas stockée sur l'inquiry, elle est lue ici.
        var customerIds = inquiries.Select(i => i.CustomerId).ToList();
        if (listing.SoldToCustomerId is { } soldTo) customerIds.Add(soldTo);

        var customers = (await _db.Customers.AsNoTracking()
                .Where(c => customerIds.Contains(c.Id))
                .Select(c => new BuyerIdentity(c.Id, c.FullName, c.Phone, c.Email))
                .ToListAsync(ct))
            .ToDictionary(c => c.Id);

        var buyerName = listing.SoldToCustomerId is { } id && customers.TryGetValue(id, out var b)
            ? b.FullName
            : null;

        dossier.Listing = MapListing(listing, buyerName);
        dossier.PriceHistory = priceChanges.Select(MapPriceChange).ToList();
        dossier.ChannelPosts = posts.Select(p => MapPost(p, listing.AskingPrice)).ToList();
        dossier.Photos = photos.Select(MapPhoto).ToList();
        dossier.Inquiries = inquiries
            .Select(i => MapInquiry(i, customers.GetValueOrDefault(i.CustomerId)))
            .ToList();
        dossier.Metrics = BuildMetrics(listing, priceChanges, posts, photos, inquiries);

        return dossier;
    }

    public async Task<SaleListingsListResponseDto> ListAsync(
        SaleListingsListRequestDto request,
        CancellationToken ct = default)
    {
        var query = _db.VehicleSaleListings.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Status)
            && !string.Equals(request.Status, "All", StringComparison.OrdinalIgnoreCase))
        {
            if (!Enum.TryParse<VehicleSaleStatus>(request.Status, ignoreCase: true, out var status))
                throw new ArgumentException($"Statut de vente « {request.Status} » inconnu.");
            query = query.Where(l => l.Status == status);
        }

        // Le stock utile par défaut : ni vendu, ni retiré.
        if (string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(l =>
                l.Status != VehicleSaleStatus.Sold && l.Status != VehicleSaleStatus.Withdrawn);
        }

        var listings = await query.ToListAsync(ct);

        // Filtre texte sur le véhicule : résolu après coup pour rester sur une seule
        // requête véhicule quel que soit le nombre de dossiers.
        var vehicleIds = listings.Select(l => l.VehicleId).Distinct().ToList();
        var vehicles = await _db.Vehicles.AsNoTracking()
            .Where(v => vehicleIds.Contains(v.Id))
            .Select(v => new { v.Id, v.Make, v.Model, v.Year, v.LicensePlate, v.CurrentMileage })
            .ToListAsync(ct);
        var vehicleById = vehicles.ToDictionary(v => v.Id);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var needle = request.Search.Trim();
            listings = listings.Where(l =>
            {
                if (!vehicleById.TryGetValue(l.VehicleId, out var v)) return false;
                return Contains(v.Make, needle)
                    || Contains(v.Model, needle)
                    || Contains(v.LicensePlate, needle)
                    || Contains(l.Title, needle);
            }).ToList();
        }

        var listingIds = listings.Select(l => l.Id).ToList();

        var photoStats = await _db.VehicleSalePhotos.AsNoTracking()
            .Where(p => listingIds.Contains(p.ListingId))
            .Select(p => new { p.ListingId, p.Id, p.IsPrimary, p.SortOrder })
            .ToListAsync(ct);

        var openInquiries = await _db.VehicleSaleInquiries.AsNoTracking()
            .Where(i => listingIds.Contains(i.ListingId)
                && i.Status != SaleInquiryStatus.Won
                && i.Status != SaleInquiryStatus.Lost)
            .Select(i => i.ListingId)
            .ToListAsync(ct);
        var openByListing = openInquiries.GroupBy(x => x).ToDictionary(g => g.Key, g => g.Count());

        var ordered = listings
            .OrderBy(l => l.Status)
            .ThenBy(l => l.ListedAt ?? l.CreatedAt)
            .ToList();

        var total = ordered.Count;
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var items = ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l =>
            {
                vehicleById.TryGetValue(l.VehicleId, out var v);
                var photos = photoStats.Where(p => p.ListingId == l.Id).ToList();
                var primary = photos.FirstOrDefault(p => p.IsPrimary)
                    ?? photos.OrderBy(p => p.SortOrder).FirstOrDefault();

                return new SaleListingListItemDto
                {
                    Id = l.Id,
                    VehicleId = l.VehicleId,
                    VehicleLabel = v is null ? "" : $"{v.Make} {v.Model}".Trim(),
                    LicensePlate = v?.LicensePlate,
                    Year = v?.Year,
                    CurrentMileage = v?.CurrentMileage ?? 0,
                    Status = l.Status.ToString(),
                    AskingPrice = l.AskingPrice,
                    EstimatedMargin = EstimatedMargin(l),
                    DaysInStock = DaysInStock(l),
                    PhotoCount = photos.Count,
                    OpenInquiryCount = openByListing.GetValueOrDefault(l.Id, 0),
                    PrimaryPhotoId = primary?.Id,
                    ListedAt = l.ListedAt
                };
            })
            .ToList();

        return new SaleListingsListResponseDto
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Items = items
        };
    }

    // --- Dossier --------------------------------------------------------

    public async Task<SaleDossierDto> UpsertListingAsync(
        Guid vehicleId,
        UpsertSaleListingRequestDto request,
        CancellationToken ct = default)
    {
        var listing = await GetOrCreateListingAsync(vehicleId, ct);

        if (request.Status is not null)
        {
            if (!Enum.TryParse<VehicleSaleStatus>(request.Status, ignoreCase: true, out var status))
                throw new ArgumentException($"Statut de vente « {request.Status} » inconnu.");

            // Publier date la mise en vente : c'est l'origine du compteur « jours en stock ».
            if (status == VehicleSaleStatus.ForSale && listing.ListedAt is null)
                listing.ListedAt = DateTime.UtcNow;

            if (status == VehicleSaleStatus.Sold && listing.SoldAt is null)
                listing.SoldAt = DateTime.UtcNow;

            listing.Status = status;
        }

        if (request.Title is not null) listing.Title = Normalize(request.Title);
        if (request.Description is not null) listing.Description = Normalize(request.Description);
        if (request.Equipment is not null) listing.Equipment = Normalize(request.Equipment);
        if (request.InternalNotes is not null) listing.InternalNotes = Normalize(request.InternalNotes);

        // Le prix affiché passe par ApplyPriceChange pour rester historisé, y compris
        // quand il est modifié depuis le formulaire général du dossier.
        if (request.AskingPrice.HasValue && request.AskingPrice != listing.AskingPrice)
            ApplyPriceChange(listing, request.AskingPrice.Value, reason: null);

        if (request.FloorPrice.HasValue) listing.FloorPrice = request.FloorPrice;
        if (request.PurchasePrice.HasValue) listing.PurchasePrice = request.PurchasePrice;
        if (request.ReconditioningCost.HasValue) listing.ReconditioningCost = request.ReconditioningCost;
        if (request.IsPriceNegotiable.HasValue) listing.IsPriceNegotiable = request.IsPriceNegotiable.Value;

        if (request.SoldPrice.HasValue) listing.SoldPrice = request.SoldPrice;
        if (request.SoldAt.HasValue) listing.SoldAt = ToUtc(request.SoldAt.Value);
        if (request.SoldToCustomerId.HasValue) listing.SoldToCustomerId = request.SoldToCustomerId;
        if (request.BuyerName is not null) listing.BuyerName = Normalize(request.BuyerName);
        if (request.ListedAt.HasValue) listing.ListedAt = ToUtc(request.ListedAt.Value);

        if (request.Origin is not null) listing.Origin = Normalize(request.Origin);
        if (request.OwnersCount.HasValue) listing.OwnersCount = request.OwnersCount;
        if (request.HasServiceBook.HasValue) listing.HasServiceBook = request.HasServiceBook.Value;
        if (request.HasRegistrationCertificate.HasValue) listing.HasRegistrationCertificate = request.HasRegistrationCertificate.Value;
        if (request.NonPledgeCertificateAt.HasValue) listing.NonPledgeCertificateAt = ToUtc(request.NonPledgeCertificateAt.Value);
        if (request.KeysCount.HasValue) listing.KeysCount = request.KeysCount;
        if (request.WarrantyMonths.HasValue) listing.WarrantyMonths = request.WarrantyMonths;
        if (request.IsDamagedHistory.HasValue) listing.IsDamagedHistory = request.IsDamagedHistory.Value;

        await _db.SaveChangesAsync(ct);
        return await GetDossierAsync(vehicleId, ct);
    }

    public async Task DeleteListingAsync(Guid vehicleId, CancellationToken ct = default)
    {
        var listing = await _db.VehicleSaleListings.FirstOrDefaultAsync(l => l.VehicleId == vehicleId, ct);
        if (listing is null) return;

        var photos = await _db.VehicleSalePhotos.Where(p => p.ListingId == listing.Id).ToListAsync(ct);
        var fileIds = photos
            .SelectMany(p => new[] { p.StoredFileId, p.ThumbnailFileId })
            .Distinct()
            .ToList();

        var posts = await _db.VehicleSaleChannelPosts.Where(c => c.ListingId == listing.Id).ToListAsync(ct);
        var inquiries = await _db.VehicleSaleInquiries.Where(i => i.ListingId == listing.Id).ToListAsync(ct);
        var prices = await _db.VehicleSalePriceChanges.Where(p => p.ListingId == listing.Id).ToListAsync(ct);

        _db.VehicleSalePhotos.RemoveRange(photos);
        _db.VehicleSaleChannelPosts.RemoveRange(posts);
        _db.VehicleSaleInquiries.RemoveRange(inquiries);
        _db.VehicleSalePriceChanges.RemoveRange(prices);
        _db.VehicleSaleListings.Remove(listing);
        await _db.SaveChangesAsync(ct);

        await _files.DeleteAsync(fileIds, ct);
    }

    public async Task<SaleDossierDto> ChangePriceAsync(
        Guid vehicleId,
        ChangeSalePriceRequestDto request,
        CancellationToken ct = default)
    {
        var listing = await GetOrCreateListingAsync(vehicleId, ct);
        ApplyPriceChange(listing, request.Price, Normalize(request.Reason));
        await _db.SaveChangesAsync(ct);
        return await GetDossierAsync(vehicleId, ct);
    }

    // --- Annonces externes ----------------------------------------------

    public async Task<SaleDossierDto> AddChannelPostAsync(
        Guid vehicleId,
        UpsertChannelPostRequestDto request,
        CancellationToken ct = default)
    {
        var listing = await GetOrCreateListingAsync(vehicleId, ct);

        var post = new VehicleSaleChannelPost
        {
            OrganizationId = listing.OrganizationId,
            ListingId = listing.Id,
            VehicleId = listing.VehicleId,
            // Par défaut, une annonce dont on connaît l'URL est déjà en ligne.
            Status = ParsePostStatus(request.Status)
                ?? (string.IsNullOrWhiteSpace(request.Url) ? SaleChannelPostStatus.Draft : SaleChannelPostStatus.Online)
        };

        ApplyPost(post, request, listing);
        _db.VehicleSaleChannelPosts.Add(post);
        await _db.SaveChangesAsync(ct);

        return await GetDossierAsync(vehicleId, ct);
    }

    public async Task<SaleDossierDto> UpdateChannelPostAsync(
        Guid postId,
        UpsertChannelPostRequestDto request,
        CancellationToken ct = default)
    {
        var post = await _db.VehicleSaleChannelPosts.FirstOrDefaultAsync(c => c.Id == postId, ct)
            ?? throw new KeyNotFoundException($"Annonce {postId} introuvable.");

        var listing = await _db.VehicleSaleListings.AsNoTracking()
            .FirstAsync(l => l.Id == post.ListingId, ct);

        if (ParsePostStatus(request.Status) is { } status) post.Status = status;
        ApplyPost(post, request, listing);

        await _db.SaveChangesAsync(ct);
        return await GetDossierAsync(post.VehicleId, ct);
    }

    public async Task<SaleDossierDto> DeleteChannelPostAsync(Guid postId, CancellationToken ct = default)
    {
        var post = await _db.VehicleSaleChannelPosts.FirstOrDefaultAsync(c => c.Id == postId, ct)
            ?? throw new KeyNotFoundException($"Annonce {postId} introuvable.");

        var vehicleId = post.VehicleId;
        _db.VehicleSaleChannelPosts.Remove(post);
        await _db.SaveChangesAsync(ct);

        return await GetDossierAsync(vehicleId, ct);
    }

    // --- Photos ---------------------------------------------------------

    public async Task<SaleDossierDto> AddPhotosAsync(
        Guid vehicleId,
        IReadOnlyList<PhotoUpload> uploads,
        CancellationToken ct = default)
    {
        if (uploads.Count == 0) throw new ArgumentException("Aucun fichier reçu.");

        var listing = await GetOrCreateListingAsync(vehicleId, ct);
        // Le listing doit exister en base avant que les photos ne le référencent.
        await _db.SaveChangesAsync(ct);

        var nextOrder = await _db.VehicleSalePhotos
            .Where(p => p.ListingId == listing.Id)
            .Select(p => (int?)p.SortOrder)
            .MaxAsync(ct) is { } max ? max + 1 : 0;

        var hasPrimary = await _db.VehicleSalePhotos.AnyAsync(p => p.ListingId == listing.Id && p.IsPrimary, ct);

        foreach (var upload in uploads)
        {
            // La compression est le cœur du dispositif : une photo de smartphone de
            // 8 Mo tombe à ~300 Ko, ce qui rend le stockage en base tenable.
            var full = _images.Compress(upload.Content, PhotoMaxDimension, PhotoQuality);
            var thumb = _images.Compress(upload.Content, ThumbnailMaxDimension, ThumbnailQuality);

            var fullId = await _files.SaveAsync(PhotoFolder, upload.FileName, full.ContentType, full.Content, ct);
            var thumbId = await _files.SaveAsync(PhotoFolder, $"thumb-{upload.FileName}", thumb.ContentType, thumb.Content, ct);

            _db.VehicleSalePhotos.Add(new VehicleSalePhoto
            {
                OrganizationId = listing.OrganizationId,
                ListingId = listing.Id,
                VehicleId = listing.VehicleId,
                StoredFileId = fullId,
                ThumbnailFileId = thumbId,
                SortOrder = nextOrder++,
                Width = full.Width,
                Height = full.Height,
                SizeBytes = full.Content.LongLength,
                OriginalSizeBytes = upload.Content.LongLength,
                OriginalFileName = upload.FileName,
                IsPrimary = !hasPrimary && (hasPrimary = true)
            });
        }

        await _db.SaveChangesAsync(ct);
        return await GetDossierAsync(vehicleId, ct);
    }

    public async Task<SaleDossierDto> UpdatePhotoAsync(
        Guid photoId,
        UpdateSalePhotoRequestDto request,
        CancellationToken ct = default)
    {
        var photo = await _db.VehicleSalePhotos.FirstOrDefaultAsync(p => p.Id == photoId, ct)
            ?? throw new KeyNotFoundException($"Photo {photoId} introuvable.");

        if (request.Caption is not null) photo.Caption = Normalize(request.Caption);

        if (request.IsPrimary == true)
        {
            // Une seule photo mise en avant par dossier.
            var siblings = await _db.VehicleSalePhotos
                .Where(p => p.ListingId == photo.ListingId && p.IsPrimary && p.Id != photo.Id)
                .ToListAsync(ct);
            foreach (var s in siblings) s.IsPrimary = false;
            photo.IsPrimary = true;
        }
        else if (request.IsPrimary == false)
        {
            photo.IsPrimary = false;
        }

        await _db.SaveChangesAsync(ct);
        return await GetDossierAsync(photo.VehicleId, ct);
    }

    public async Task<SaleDossierDto> ReorderPhotosAsync(
        Guid vehicleId,
        ReorderSalePhotosRequestDto request,
        CancellationToken ct = default)
    {
        var listing = await _db.VehicleSaleListings.AsNoTracking()
            .FirstOrDefaultAsync(l => l.VehicleId == vehicleId, ct)
            ?? throw new KeyNotFoundException("Aucun dossier de vente sur ce véhicule.");

        var photos = await _db.VehicleSalePhotos.Where(p => p.ListingId == listing.Id).ToListAsync(ct);
        var byId = photos.ToDictionary(p => p.Id);

        var order = 0;
        foreach (var id in request.PhotoIds)
        {
            if (byId.TryGetValue(id, out var photo)) photo.SortOrder = order++;
        }

        // Les photos absentes de la requête sont poussées derrière, ordre relatif conservé.
        foreach (var photo in photos.Where(p => !request.PhotoIds.Contains(p.Id)).OrderBy(p => p.SortOrder))
        {
            photo.SortOrder = order++;
        }

        await _db.SaveChangesAsync(ct);
        return await GetDossierAsync(vehicleId, ct);
    }

    public async Task<SaleDossierDto> DeletePhotoAsync(Guid photoId, CancellationToken ct = default)
    {
        var photo = await _db.VehicleSalePhotos.FirstOrDefaultAsync(p => p.Id == photoId, ct)
            ?? throw new KeyNotFoundException($"Photo {photoId} introuvable.");

        var vehicleId = photo.VehicleId;
        var wasPrimary = photo.IsPrimary;
        var listingId = photo.ListingId;

        _db.VehicleSalePhotos.Remove(photo);
        await _db.SaveChangesAsync(ct);

        // La galerie ne doit jamais rester sans photo mise en avant.
        if (wasPrimary)
        {
            var next = await _db.VehicleSalePhotos
                .Where(p => p.ListingId == listingId)
                .OrderBy(p => p.SortOrder)
                .FirstOrDefaultAsync(ct);
            if (next is not null)
            {
                next.IsPrimary = true;
                await _db.SaveChangesAsync(ct);
            }
        }

        await _files.DeleteAsync(new[] { photo.StoredFileId, photo.ThumbnailFileId }, ct);
        return await GetDossierAsync(vehicleId, ct);
    }

    public async Task<FileContent?> GetPhotoContentAsync(
        Guid photoId,
        bool thumbnail,
        CancellationToken ct = default)
    {
        var photo = await _db.VehicleSalePhotos.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == photoId, ct);
        if (photo is null) return null;

        return await _files.GetAsync(thumbnail ? photo.ThumbnailFileId : photo.StoredFileId, ct);
    }

    public async Task<ProcessedImage> BuildMosaicAsync(
        Guid vehicleId,
        BuildMosaicRequestDto request,
        CancellationToken ct = default)
    {
        var listing = await _db.VehicleSaleListings.AsNoTracking()
            .FirstOrDefaultAsync(l => l.VehicleId == vehicleId, ct)
            ?? throw new KeyNotFoundException("Aucun dossier de vente sur ce véhicule.");

        var layout = new MosaicLayout(
            Math.Clamp(request.Columns, 1, 6),
            Math.Clamp(request.Rows, 1, 6));

        var requested = request.PhotoIds.Take(layout.Capacity).ToList();
        if (requested.Count == 0)
            throw new ArgumentException("Sélectionnez au moins une photo pour composer la mosaïque.");

        var photos = await _db.VehicleSalePhotos.AsNoTracking()
            .Where(p => p.ListingId == listing.Id && requested.Contains(p.Id))
            .ToListAsync(ct);

        // On respecte l'ordre demandé par l'utilisateur, pas celui renvoyé par la base.
        var ordered = requested
            .Select(id => photos.FirstOrDefault(p => p.Id == id))
            .Where(p => p is not null)
            .Select(p => p!)
            .ToList();

        if (ordered.Count == 0)
            throw new KeyNotFoundException("Les photos demandées n'appartiennent pas à ce dossier.");

        var sources = new List<byte[]>(ordered.Count);
        foreach (var photo in ordered)
        {
            var content = await _files.GetAsync(photo.StoredFileId, ct);
            if (content is not null) sources.Add(content.Content);
        }

        return _images.BuildMosaic(
            sources,
            layout,
            Math.Clamp(request.CellSize, 200, 2000),
            Math.Clamp(request.Gap, 0, 100),
            ParseColor(request.Background),
            Math.Clamp(request.Quality, 40, 95));
    }

    // --- Prospection ----------------------------------------------------

    public async Task<SaleDossierDto> AddInquiryAsync(
        Guid vehicleId,
        UpsertInquiryRequestDto request,
        CancellationToken ct = default)
    {
        var listing = await GetOrCreateListingAsync(vehicleId, ct);

        var channel = ParseChannel(request.Channel) ?? SaleInquiryChannel.Phone;
        var customerId = await ResolveBuyerAsync(request, existingCustomerId: null, channel, ct);

        var inquiry = new VehicleSaleInquiry
        {
            OrganizationId = listing.OrganizationId,
            ListingId = listing.Id,
            VehicleId = listing.VehicleId,
            CustomerId = customerId,
            ReceivedAt = request.ReceivedAt.HasValue ? ToUtc(request.ReceivedAt.Value) : DateTime.UtcNow
        };

        ApplyInquiry(inquiry, request);
        _db.VehicleSaleInquiries.Add(inquiry);
        await _db.SaveChangesAsync(ct);

        return await GetDossierAsync(vehicleId, ct);
    }

    public async Task<SaleDossierDto> UpdateInquiryAsync(
        Guid inquiryId,
        UpsertInquiryRequestDto request,
        CancellationToken ct = default)
    {
        var inquiry = await _db.VehicleSaleInquiries.FirstOrDefaultAsync(i => i.Id == inquiryId, ct)
            ?? throw new KeyNotFoundException($"Contact {inquiryId} introuvable.");

        var channel = ParseChannel(request.Channel) ?? inquiry.Channel;
        inquiry.CustomerId = await ResolveBuyerAsync(request, inquiry.CustomerId, channel, ct);

        if (request.ReceivedAt.HasValue) inquiry.ReceivedAt = ToUtc(request.ReceivedAt.Value);
        ApplyInquiry(inquiry, request);

        await _db.SaveChangesAsync(ct);
        return await GetDossierAsync(inquiry.VehicleId, ct);
    }

    public async Task<CustomerSaleInquiriesResponseDto> ListCustomerInquiriesAsync(
        Guid customerId,
        CancellationToken ct = default)
    {
        var inquiries = await _db.VehicleSaleInquiries.AsNoTracking()
            .Where(i => i.CustomerId == customerId)
            .OrderByDescending(i => i.ReceivedAt)
            .ToListAsync(ct);

        if (inquiries.Count == 0) return new CustomerSaleInquiriesResponseDto();

        var vehicleIds = inquiries.Select(i => i.VehicleId).Distinct().ToList();

        var vehicles = (await _db.Vehicles.AsNoTracking()
                .Where(v => vehicleIds.Contains(v.Id))
                .Select(v => new { v.Id, v.Make, v.Model, v.LicensePlate })
                .ToListAsync(ct))
            .ToDictionary(v => v.Id);

        var listings = (await _db.VehicleSaleListings.AsNoTracking()
                .Where(l => vehicleIds.Contains(l.VehicleId))
                .Select(l => new { l.VehicleId, l.Status, l.AskingPrice })
                .ToListAsync(ct))
            .ToDictionary(l => l.VehicleId);

        var items = inquiries.Select(i =>
        {
            vehicles.TryGetValue(i.VehicleId, out var v);
            listings.TryGetValue(i.VehicleId, out var l);
            var label = v is null ? string.Empty : $"{v.Make} {v.Model}".Trim();

            return new CustomerSaleInquiryDto
            {
                Id = i.Id,
                VehicleId = i.VehicleId,
                VehicleLabel = label,
                LicensePlate = v?.LicensePlate,
                AskingPrice = l?.AskingPrice,
                VehicleSaleStatus = l?.Status.ToString() ?? nameof(VehicleSaleStatus.Draft),
                Channel = i.Channel.ToString(),
                Status = i.Status.ToString(),
                ReceivedAt = i.ReceivedAt,
                OfferAmount = i.OfferAmount,
                TestDriveAt = i.TestDriveAt,
                NextFollowUpAt = i.NextFollowUpAt,
                LostReason = i.LostReason,
                Notes = i.Notes
            };
        }).ToList();

        return new CustomerSaleInquiriesResponseDto
        {
            Items = items,
            OpenCount = inquiries.Count(i =>
                i.Status != SaleInquiryStatus.Won && i.Status != SaleInquiryStatus.Lost)
        };
    }

    public async Task<SaleDossierDto> DeleteInquiryAsync(Guid inquiryId, CancellationToken ct = default)
    {
        var inquiry = await _db.VehicleSaleInquiries.FirstOrDefaultAsync(i => i.Id == inquiryId, ct)
            ?? throw new KeyNotFoundException($"Contact {inquiryId} introuvable.");

        var vehicleId = inquiry.VehicleId;
        _db.VehicleSaleInquiries.Remove(inquiry);
        await _db.SaveChangesAsync(ct);

        return await GetDossierAsync(vehicleId, ct);
    }

    // --- Carte grise ----------------------------------------------------

    public async Task<SaleDossierDto> UpsertRegistrationAsync(
        Guid vehicleId,
        UpsertRegistrationRequestDto request,
        CancellationToken ct = default)
    {
        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Organisation active requise.");

        _ = await _db.Vehicles.AsNoTracking().AnyAsync(v => v.Id == vehicleId, ct)
            ? true
            : throw new KeyNotFoundException($"Véhicule {vehicleId} introuvable.");

        var detail = await _db.VehicleRegistrationDetails.FirstOrDefaultAsync(r => r.VehicleId == vehicleId, ct);
        if (detail is null)
        {
            detail = new VehicleRegistrationDetail { OrganizationId = orgId, VehicleId = vehicleId };
            _db.VehicleRegistrationDetails.Add(detail);
        }

        detail.FirstRegisteredAt = ToUtcOrNull(request.FirstRegisteredAt);
        detail.CertificateIssuedAt = ToUtcOrNull(request.CertificateIssuedAt);
        detail.CertificateFormulaNumber = Normalize(request.CertificateFormulaNumber);

        detail.HolderName = Normalize(request.HolderName);
        detail.HolderAddress = Normalize(request.HolderAddress);

        detail.TypeVariantVersion = Normalize(request.TypeVariantVersion);
        detail.NationalTypeCode = Normalize(request.NationalTypeCode);
        detail.CommercialName = Normalize(request.CommercialName);
        detail.TypeApprovalNumber = Normalize(request.TypeApprovalNumber);

        detail.EuCategory = NormalizeUpper(request.EuCategory);
        detail.NationalGenre = NormalizeUpper(request.NationalGenre);
        detail.EuBodyType = NormalizeUpper(request.EuBodyType);
        detail.NationalBodyType = NormalizeUpper(request.NationalBodyType);

        detail.TechnicallyPermissibleMaxMassKg = request.TechnicallyPermissibleMaxMassKg;
        detail.MaxMassInServiceKg = request.MaxMassInServiceKg;
        detail.MaxTrainMassKg = request.MaxTrainMassKg;
        detail.MassInServiceKg = request.MassInServiceKg;
        detail.NationalEmptyMassKg = request.NationalEmptyMassKg;

        detail.EngineDisplacementCm3 = request.EngineDisplacementCm3;
        detail.MaxNetPowerKw = request.MaxNetPowerKw;
        detail.FuelCode = NormalizeUpper(request.FuelCode);
        detail.FiscalHorsepower = request.FiscalHorsepower;
        detail.PowerToMassRatio = request.PowerToMassRatio;

        detail.SeatingCapacity = request.SeatingCapacity;
        detail.StandingCapacity = request.StandingCapacity;

        detail.SoundLevelDb = request.SoundLevelDb;
        detail.EngineSpeedRpm = request.EngineSpeedRpm;

        detail.Co2GramsPerKm = request.Co2GramsPerKm;
        detail.EmissionClass = Normalize(request.EmissionClass);

        detail.LastTechnicalInspectionAt = ToUtcOrNull(request.LastTechnicalInspectionAt);
        detail.TechnicalInspectionValidUntil = ToUtcOrNull(request.TechnicalInspectionValidUntil);

        await _db.SaveChangesAsync(ct);
        return await GetDossierAsync(vehicleId, ct);
    }

    // --- Export ---------------------------------------------------------

    public async Task<ExportedDossier> ExportAsync(
        Guid vehicleId,
        bool includeInternal = false,
        CancellationToken ct = default)
    {
        var vehicle = await _db.Vehicles.AsNoTracking().FirstOrDefaultAsync(v => v.Id == vehicleId, ct)
            ?? throw new KeyNotFoundException($"Véhicule {vehicleId} introuvable.");

        var dossier = await GetDossierAsync(vehicleId, ct);
        var fr = CultureInfo.GetCultureInfo("fr-FR");
        var sb = new StringBuilder();

        void Line(string label, string? value)
        {
            if (!string.IsNullOrWhiteSpace(value)) sb.AppendLine($"{label} : {value}");
        }

        string? D(DateTime? d) => d?.ToString("dd/MM/yyyy", fr);
        string? M(decimal? m) => m?.ToString("C0", fr);

        sb.AppendLine($"DOSSIER VÉHICULE — {dossier.VehicleLabel}");
        sb.AppendLine($"Généré le {DateTime.UtcNow.ToString("dd/MM/yyyy", fr)}");
        sb.AppendLine();

        sb.AppendLine("== IDENTIFICATION ==");
        Line("Immatriculation (A)", vehicle.LicensePlate);
        Line("Marque (D.1)", vehicle.Make);
        Line("Modèle", vehicle.Model);
        Line("VIN (E)", vehicle.Vin);
        Line("Année", vehicle.Year?.ToString(fr));
        Line("Couleur", vehicle.Color);
        Line("Kilométrage", $"{vehicle.CurrentMileage.ToString("N0", fr)} km");
        sb.AppendLine();

        var r = dossier.Registration;
        if (r is not null)
        {
            sb.AppendLine("== CERTIFICAT D'IMMATRICULATION ==");
            Line("Date de 1re immatriculation (B)", D(r.FirstRegisteredAt));
            Line("Date du certificat (I)", D(r.CertificateIssuedAt));
            Line("Numéro de formule", r.CertificateFormulaNumber);
            Line("Titulaire (C.1)", r.HolderName);
            Line("Adresse (C.3)", r.HolderAddress);
            Line("Type/variante/version (D.2)", r.TypeVariantVersion);
            Line("Type national (D.2.1)", r.NationalTypeCode);
            Line("Dénomination commerciale (D.3)", r.CommercialName);
            Line("Réception par type (K)", r.TypeApprovalNumber);
            Line("Catégorie CE (J)", r.EuCategory);
            Line("Genre national (J.1)", r.NationalGenre);
            Line("Carrosserie CE (J.2)", r.EuBodyType);
            Line("Carrosserie nationale (J.3)", r.NationalBodyType);
            Line("MMA techniquement admissible (F.1)", Kg(r.TechnicallyPermissibleMaxMassKg));
            Line("MMA en service (F.2)", Kg(r.MaxMassInServiceKg));
            Line("MMA de l'ensemble (F.3)", Kg(r.MaxTrainMassKg));
            Line("Masse en service (G)", Kg(r.MassInServiceKg));
            Line("Poids à vide national (G.1)", Kg(r.NationalEmptyMassKg));
            Line("Cylindrée (P.1)", r.EngineDisplacementCm3 is { } c ? $"{c} cm³" : null);
            Line("Puissance nette (P.2)", r.MaxNetPowerKw is { } kw ? $"{kw.ToString("0.##", fr)} kW" : null);
            Line("Carburant (P.3)", r.FuelCode);
            Line("Puissance administrative (P.6)", r.FiscalHorsepower is { } cv ? $"{cv} CV" : null);
            Line("Places assises (S.1)", r.SeatingCapacity?.ToString(fr));
            Line("Places debout (S.2)", r.StandingCapacity?.ToString(fr));
            Line("Niveau sonore (U.1)", r.SoundLevelDb is { } db ? $"{db} dB(A)" : null);
            Line("Régime moteur (U.2)", r.EngineSpeedRpm is { } rpm ? $"{rpm} min⁻¹" : null);
            Line("CO₂ (V.7)", r.Co2GramsPerKm is { } co2 ? $"{co2} g/km" : null);
            Line("Classe environnementale (V.9)", r.EmissionClass);
            Line("Dernier contrôle technique (X.1)", D(r.LastTechnicalInspectionAt));
            Line("Validité du contrôle technique", D(r.TechnicalInspectionValidUntil));
            sb.AppendLine();
        }

        var readiness = dossier.RegistrationReadiness;
        if (readiness.Missing.Count > 0)
        {
            sb.AppendLine("== INFORMATIONS MANQUANTES POUR L'IMMATRICULATION ==");
            foreach (var m in readiness.Missing)
            {
                var marker = m.Marker is null ? "" : $" ({m.Marker})";
                var level = m.Level == nameof(RegistrationRequirementLevel.Required) ? "obligatoire" : "recommandé";
                sb.AppendLine($"- {m.Label}{marker} — {level}");
            }
            sb.AppendLine();
        }

        if (dossier.Listing is { } l)
        {
            sb.AppendLine("== VENTE ==");
            Line("Statut", SaleStatusLabel(l.Status));
            Line("Prix affiché", M(l.AskingPrice));

            // Chiffres confidentiels : le dossier est souvent transmis tel quel à
            // un acheteur, ils ne sortent donc que sur demande explicite.
            if (includeInternal)
            {
                Line("Prix plancher (interne)", M(l.FloorPrice));
                Line("Prix d'achat (interne)", M(l.PurchasePrice));
                Line("Remise en état (interne)", M(l.ReconditioningCost));
                Line("Prix de revient (interne)", M(dossier.Metrics.TotalCost));
                Line("Marge estimée (interne)", M(dossier.Metrics.EstimatedMargin));
            }

            Line("Mise en vente", D(l.ListedAt));
            Line("Jours en stock", dossier.Metrics.DaysInStock?.ToString(fr));
            Line("Vendu le", D(l.SoldAt));
            Line("Prix de vente", M(l.SoldPrice));
            Line("Acheteur", l.SoldToCustomerName ?? l.BuyerName);
            Line("Provenance", l.Origin);
            Line("Propriétaires", l.OwnersCount?.ToString(fr));
            Line("Clés", l.KeysCount?.ToString(fr));
            Line("Garantie", l.WarrantyMonths is { } w ? $"{w} mois" : null);
            Line("Carnet d'entretien", l.HasServiceBook ? "oui" : "non");
            Line("Carte grise disponible", l.HasRegistrationCertificate ? "oui" : "non");
            Line("Certificat de non-gage", D(l.NonPledgeCertificateAt));
            Line("Véhicule accidenté/réparé", l.IsDamagedHistory ? "oui" : "non");
            sb.AppendLine();

            if (!string.IsNullOrWhiteSpace(l.Description))
            {
                sb.AppendLine("== ANNONCE ==");
                if (!string.IsNullOrWhiteSpace(l.Title)) sb.AppendLine(l.Title);
                sb.AppendLine(l.Description);
                sb.AppendLine();
            }

            if (!string.IsNullOrWhiteSpace(l.Equipment))
            {
                sb.AppendLine("== ÉQUIPEMENTS ==");
                sb.AppendLine(l.Equipment);
                sb.AppendLine();
            }

            if (includeInternal && !string.IsNullOrWhiteSpace(l.InternalNotes))
            {
                sb.AppendLine("== NOTES INTERNES ==");
                sb.AppendLine(l.InternalNotes);
                sb.AppendLine();
            }
        }

        if (dossier.ChannelPosts.Count > 0)
        {
            sb.AppendLine("== ANNONCES PUBLIÉES ==");
            foreach (var p in dossier.ChannelPosts)
            {
                var price = p.DisplayedPrice is null ? "" : $" — {M(p.DisplayedPrice)}";
                sb.AppendLine($"- {p.Channel} [{PostStatusLabel(p.Status)}]{price}");
                if (!string.IsNullOrWhiteSpace(p.Url)) sb.AppendLine($"  {p.Url}");
            }
            sb.AppendLine();
        }

        var plate = string.IsNullOrWhiteSpace(vehicle.LicensePlate)
            ? vehicle.Id.ToString()[..8]
            : vehicle.LicensePlate.Replace(" ", "").Replace("-", "");

        return new ExportedDossier($"dossier-{plate}.txt", sb.ToString());

        string? Kg(int? v) => v is null ? null : $"{v} kg";
    }

    // --- Helpers --------------------------------------------------------

    /// <summary>
    /// Récupère le dossier du véhicule, en le créant à la volée au premier geste
    /// commercial (ajouter une photo ou un contact ouvre le dossier). Le listing
    /// n'est pas encore persisté au retour : l'appelant enchaîne sur SaveChanges.
    /// </summary>
    private async Task<VehicleSaleListing> GetOrCreateListingAsync(Guid vehicleId, CancellationToken ct)
    {
        var listing = await _db.VehicleSaleListings.FirstOrDefaultAsync(l => l.VehicleId == vehicleId, ct);
        if (listing is not null) return listing;

        var orgId = _currentUser.OrganizationId
            ?? throw new UnauthorizedAccessException("Organisation active requise.");

        var exists = await _db.Vehicles.AsNoTracking().AnyAsync(v => v.Id == vehicleId, ct);
        if (!exists) throw new KeyNotFoundException($"Véhicule {vehicleId} introuvable.");

        listing = new VehicleSaleListing
        {
            OrganizationId = orgId,
            VehicleId = vehicleId,
            Status = VehicleSaleStatus.Draft
        };
        _db.VehicleSaleListings.Add(listing);
        return listing;
    }

    /// <summary>Met à jour le prix affiché et empile la ligne d'historique correspondante.</summary>
    private void ApplyPriceChange(VehicleSaleListing listing, decimal price, string? reason)
    {
        if (price < 0) throw new ArgumentException("Le prix ne peut pas être négatif.");

        var previous = listing.AskingPrice;
        listing.AskingPrice = price;

        _db.VehicleSalePriceChanges.Add(new VehicleSalePriceChange
        {
            OrganizationId = listing.OrganizationId,
            ListingId = listing.Id,
            VehicleId = listing.VehicleId,
            Price = price,
            PreviousPrice = previous,
            ChangedAt = DateTime.UtcNow,
            Reason = reason
        });
    }

    private static void ApplyPost(
        VehicleSaleChannelPost post,
        UpsertChannelPostRequestDto request,
        VehicleSaleListing listing)
    {
        if (string.IsNullOrWhiteSpace(request.Channel))
            throw new ArgumentException("Le site de publication est requis.");

        post.Channel = request.Channel.Trim();
        post.Url = Normalize(request.Url);
        post.ExternalReference = Normalize(request.ExternalReference);
        post.Notes = Normalize(request.Notes);
        post.PublishedAt = ToUtcOrNull(request.PublishedAt);

        // Sans prix explicite, on retient le prix du dossier : c'est ce qui est censé
        // être affiché, et l'écart deviendra visible si le dossier bouge plus tard.
        post.DisplayedPrice = request.DisplayedPrice ?? listing.AskingPrice;

        if (post.Status == SaleChannelPostStatus.Online && post.PublishedAt is null)
            post.PublishedAt = DateTime.UtcNow;
    }

    private static void ApplyInquiry(VehicleSaleInquiry inquiry, UpsertInquiryRequestDto request)
    {
        inquiry.OfferAmount = request.OfferAmount;
        inquiry.TestDriveAt = ToUtcOrNull(request.TestDriveAt);
        inquiry.NextFollowUpAt = ToUtcOrNull(request.NextFollowUpAt);
        inquiry.Notes = Normalize(request.Notes);

        if (ParseChannel(request.Channel) is { } channel) inquiry.Channel = channel;

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (!Enum.TryParse<SaleInquiryStatus>(request.Status, ignoreCase: true, out var status))
                throw new ArgumentException($"Statut de contact « {request.Status} » inconnu.");
            inquiry.Status = status;
        }

        // Le motif de perte n'a de sens que sur un contact perdu.
        inquiry.LostReason = inquiry.Status == SaleInquiryStatus.Lost
            ? Normalize(request.LostReason)
            : null;
    }

    /// <summary>
    /// Détermine la fiche client de l'acheteur. Trois cas, dans cet ordre :
    /// un client explicitement choisi ; un nouvel acheteur décrit, qu'on rapproche
    /// d'abord d'une fiche existante par téléphone ou e-mail avant d'en créer une ;
    /// enfin, en édition, le rattachement déjà en place.
    /// Le rapprochement évite le doublon classique — l'acheteur qui rappelle sur un
    /// second véhicule et qu'on re-saisit à la main.
    /// </summary>
    private async Task<Guid> ResolveBuyerAsync(
        UpsertInquiryRequestDto request,
        Guid? existingCustomerId,
        SaleInquiryChannel channel,
        CancellationToken ct)
    {
        if (request.CustomerId is { } chosenId)
        {
            var exists = await _db.Customers.AsNoTracking().AnyAsync(c => c.Id == chosenId, ct);
            if (!exists) throw new KeyNotFoundException("Client introuvable.");
            return chosenId;
        }

        if (request.NewBuyer is { } buyer)
        {
            if (string.IsNullOrWhiteSpace(buyer.FullName))
                throw new ArgumentException("Le nom de l'acheteur est requis.");

            var orgId = _currentUser.OrganizationId
                ?? throw new UnauthorizedAccessException("Organisation active requise.");

            var countryCode = await _db.Organizations
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(o => o.Id == orgId && o.DeletedAt == null)
                .Select(o => o.PhoneCountryCode)
                .FirstOrDefaultAsync(ct);

            var phone = PhoneNormalizer.Normalize(buyer.Phone, countryCode);
            var email = Normalize(buyer.Email)?.ToLowerInvariant();

            var match = await FindExistingBuyerAsync(phone, email, ct);
            if (match is not null) return match.Value;

            var customer = new Customer
            {
                OrganizationId = orgId,
                FullName = buyer.FullName.Trim(),
                Phone = phone,
                Email = Normalize(buyer.Email),
                // L'acheteur d'un véhicule n'est pas (encore) un client de l'atelier :
                // il entre dans le pipeline prospects, où il sera relancé comme tel.
                Status = CustomerStatus.Prospect,
                AcquiredAt = DateTime.UtcNow
            };
            _db.Customers.Add(customer);

            _db.LeadProfiles.Add(new LeadProfile
            {
                OrganizationId = orgId,
                CustomerId = customer.Id,
                Stage = LeadStage.New,
                Source = ToLeadSource(channel),
                InterestSummary = "Acheteur véhicule"
            });

            await _db.SaveChangesAsync(ct);
            return customer.Id;
        }

        return existingCustomerId
            ?? throw new ArgumentException("Sélectionnez un client existant ou renseignez le nouvel acheteur.");
    }

    /// <summary>
    /// Cherche une fiche client déjà connue à partir du téléphone (normalisé) ou de
    /// l'e-mail. Retourne null si aucun des deux n'est exploitable — deux homonymes
    /// sans coordonnées restent deux fiches distinctes, c'est volontaire.
    /// </summary>
    private async Task<Guid?> FindExistingBuyerAsync(string? phone, string? email, CancellationToken ct)
    {
        if (phone is null && email is null) return null;

        var match = await _db.Customers.AsNoTracking()
            .Where(c => (phone != null && c.Phone == phone)
                || (email != null && c.Email != null && c.Email.ToLower() == email))
            .Select(c => new { c.Id })
            .FirstOrDefaultAsync(ct);

        return match?.Id;
    }

    private static SaleInquiryChannel? ParseChannel(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (!Enum.TryParse<SaleInquiryChannel>(value, ignoreCase: true, out var channel))
            throw new ArgumentException($"Canal de contact « {value} » inconnu.");
        return channel;
    }

    /// <summary>Aligne le canal du contact acheteur sur la source du pipeline prospects.</summary>
    private static LeadSource ToLeadSource(SaleInquiryChannel channel) => channel switch
    {
        SaleInquiryChannel.Phone => LeadSource.Phone,
        SaleInquiryChannel.Sms => LeadSource.Phone,
        SaleInquiryChannel.Email => LeadSource.WebForm,
        SaleInquiryChannel.Marketplace => LeadSource.Marketplace,
        SaleInquiryChannel.WalkIn => LeadSource.WalkIn,
        SaleInquiryChannel.Referral => LeadSource.Referral,
        _ => LeadSource.Other
    };

    private static SaleChannelPostStatus? ParsePostStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (!Enum.TryParse<SaleChannelPostStatus>(value, ignoreCase: true, out var status))
            throw new ArgumentException($"Statut d'annonce « {value} » inconnu.");
        return status;
    }

    private static RegistrationReadinessDto BuildReadiness(Vehicle vehicle, VehicleRegistrationDetail? detail)
    {
        var requirements = RegistrationChecklist.Evaluate(vehicle, detail);
        var missing = requirements.Where(r => !r.IsFilled).ToList();

        var filled = requirements.Count - missing.Count;
        var requiredMissing = missing.Count(m => m.Level == RegistrationRequirementLevel.Required);

        return new RegistrationReadinessDto
        {
            CompletionPercent = requirements.Count == 0
                ? 100
                : (int)Math.Round(filled * 100d / requirements.Count),
            IsReady = requiredMissing == 0,
            RequiredMissingCount = requiredMissing,
            RecommendedMissingCount = missing.Count - requiredMissing,
            Missing = missing
                .OrderBy(m => m.Level)
                .Select(m => new RegistrationRequirementDto
                {
                    Field = m.Field,
                    Marker = m.Marker,
                    Label = m.Label,
                    Level = m.Level.ToString()
                })
                .ToList(),
            TechnicalInspectionWarning = TechnicalInspectionWarning(vehicle, detail)
        };
    }

    /// <summary>
    /// À la cession d'un véhicule de plus de 4 ans, le contrôle technique doit dater
    /// de moins de 6 mois. On avertit dès que la limite approche pour laisser le
    /// temps de reprendre rendez-vous.
    /// </summary>
    private static string? TechnicalInspectionWarning(Vehicle vehicle, VehicleRegistrationDetail? detail)
    {
        var firstRegistered = detail?.FirstRegisteredAt
            ?? (vehicle.Year is { } y ? new DateTime(y, 1, 1, 0, 0, 0, DateTimeKind.Utc) : null);

        if (firstRegistered is null) return null;
        if ((DateTime.UtcNow - firstRegistered.Value).TotalDays < 4 * 365.25) return null;

        if (detail?.LastTechnicalInspectionAt is not { } last)
            return "Contrôle technique inconnu : il doit dater de moins de 6 mois à la date de cession.";

        var ageDays = (DateTime.UtcNow - last).TotalDays;
        if (ageDays > 182)
            return "Contrôle technique de plus de 6 mois : il doit être refait avant la cession.";
        if (ageDays > 152)
            return "Contrôle technique valable moins d'un mois pour une cession.";

        return null;
    }

    private static SaleMetricsDto BuildMetrics(
        VehicleSaleListing listing,
        IReadOnlyList<VehicleSalePriceChange> priceChanges,
        IReadOnlyList<VehicleSaleChannelPost> posts,
        IReadOnlyList<VehicleSalePhoto> photos,
        IReadOnlyList<VehicleSaleInquiry> inquiries)
    {
        var totalCost = TotalCost(listing);
        var firstPrice = priceChanges.FirstOrDefault()?.Price;

        return new SaleMetricsDto
        {
            DaysInStock = DaysInStock(listing),
            TotalCost = totalCost,
            EstimatedMargin = EstimatedMargin(listing),
            RealizedMargin = listing.SoldPrice.HasValue && totalCost.HasValue
                ? listing.SoldPrice - totalCost
                : null,
            TotalPriceDrop = firstPrice.HasValue && listing.AskingPrice.HasValue
                ? firstPrice - listing.AskingPrice
                : null,
            PhotoCount = photos.Count,
            InquiryCount = inquiries.Count,
            OpenInquiryCount = inquiries.Count(i =>
                i.Status != SaleInquiryStatus.Won && i.Status != SaleInquiryStatus.Lost),
            BestOffer = inquiries.Where(i => i.OfferAmount.HasValue)
                .Select(i => i.OfferAmount!.Value)
                .DefaultIfEmpty()
                .Max() is var best && best > 0 ? best : null,
            OnlinePostCount = posts.Count(p => p.Status == SaleChannelPostStatus.Online)
        };
    }

    private static decimal? TotalCost(VehicleSaleListing l)
        => l.PurchasePrice is null && l.ReconditioningCost is null
            ? null
            : (l.PurchasePrice ?? 0) + (l.ReconditioningCost ?? 0);

    private static decimal? EstimatedMargin(VehicleSaleListing l)
    {
        var cost = TotalCost(l);
        return l.AskingPrice.HasValue && cost.HasValue ? l.AskingPrice - cost : null;
    }

    private static int? DaysInStock(VehicleSaleListing l)
    {
        if (l.ListedAt is not { } from) return null;
        var to = l.SoldAt ?? DateTime.UtcNow;
        return Math.Max(0, (int)(to - from).TotalDays);
    }

    /// <summary>Convertit « #RRGGBB » en ARGB opaque ; retombe sur le blanc si illisible.</summary>
    private static uint ParseColor(string? hex)
    {
        const uint white = 0xFFFFFFFF;
        if (string.IsNullOrWhiteSpace(hex)) return white;

        var value = hex.Trim().TrimStart('#');
        if (value.Length != 6 || !uint.TryParse(value, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var rgb))
            return white;

        return 0xFF000000 | rgb;
    }

    private static SaleListingDto MapListing(VehicleSaleListing l, string? buyerName) => new()
    {
        Id = l.Id,
        VehicleId = l.VehicleId,
        Status = l.Status.ToString(),
        Title = l.Title,
        Description = l.Description,
        Equipment = l.Equipment,
        InternalNotes = l.InternalNotes,
        AskingPrice = l.AskingPrice,
        FloorPrice = l.FloorPrice,
        PurchasePrice = l.PurchasePrice,
        ReconditioningCost = l.ReconditioningCost,
        IsPriceNegotiable = l.IsPriceNegotiable,
        SoldPrice = l.SoldPrice,
        SoldAt = l.SoldAt,
        SoldToCustomerId = l.SoldToCustomerId,
        SoldToCustomerName = buyerName,
        BuyerName = l.BuyerName,
        ListedAt = l.ListedAt,
        Origin = l.Origin,
        OwnersCount = l.OwnersCount,
        HasServiceBook = l.HasServiceBook,
        HasRegistrationCertificate = l.HasRegistrationCertificate,
        NonPledgeCertificateAt = l.NonPledgeCertificateAt,
        KeysCount = l.KeysCount,
        WarrantyMonths = l.WarrantyMonths,
        IsDamagedHistory = l.IsDamagedHistory,
        CreatedAt = l.CreatedAt,
        UpdatedAt = l.UpdatedAt
    };

    private static SalePriceChangeDto MapPriceChange(VehicleSalePriceChange p) => new()
    {
        Id = p.Id,
        Price = p.Price,
        PreviousPrice = p.PreviousPrice,
        ChangedAt = p.ChangedAt,
        Reason = p.Reason
    };

    private static SaleChannelPostDto MapPost(VehicleSaleChannelPost c, decimal? askingPrice) => new()
    {
        Id = c.Id,
        Channel = c.Channel,
        Url = c.Url,
        ExternalReference = c.ExternalReference,
        Status = c.Status.ToString(),
        PublishedAt = c.PublishedAt,
        DisplayedPrice = c.DisplayedPrice,
        Notes = c.Notes,
        PriceOutOfSync = c.Status == SaleChannelPostStatus.Online
            && c.DisplayedPrice.HasValue
            && askingPrice.HasValue
            && c.DisplayedPrice != askingPrice
    };

    private static SalePhotoDto MapPhoto(VehicleSalePhoto p) => new()
    {
        Id = p.Id,
        SortOrder = p.SortOrder,
        Caption = p.Caption,
        IsPrimary = p.IsPrimary,
        Width = p.Width,
        Height = p.Height,
        SizeBytes = p.SizeBytes,
        OriginalSizeBytes = p.OriginalSizeBytes,
        OriginalFileName = p.OriginalFileName,
        CreatedAt = p.CreatedAt
    };

    /// <summary>Identité d'un acheteur, lue depuis sa fiche client.</summary>
    private sealed record BuyerIdentity(Guid Id, string FullName, string? Phone, string? Email);

    private static SaleInquiryDto MapInquiry(VehicleSaleInquiry i, BuyerIdentity? buyer) => new()
    {
        Id = i.Id,
        CustomerId = i.CustomerId,
        // Fiche supprimée entre-temps : on le dit plutôt que d'afficher une ligne vide.
        CustomerFullName = buyer?.FullName ?? "Client supprimé",
        Phone = buyer?.Phone,
        Email = buyer?.Email,
        Channel = i.Channel.ToString(),
        Status = i.Status.ToString(),
        ReceivedAt = i.ReceivedAt,
        OfferAmount = i.OfferAmount,
        TestDriveAt = i.TestDriveAt,
        NextFollowUpAt = i.NextFollowUpAt,
        LostReason = i.LostReason,
        Notes = i.Notes
    };

    private static RegistrationDetailDto MapRegistration(VehicleRegistrationDetail r) => new()
    {
        VehicleId = r.VehicleId,
        FirstRegisteredAt = r.FirstRegisteredAt,
        CertificateIssuedAt = r.CertificateIssuedAt,
        CertificateFormulaNumber = r.CertificateFormulaNumber,
        HolderName = r.HolderName,
        HolderAddress = r.HolderAddress,
        TypeVariantVersion = r.TypeVariantVersion,
        NationalTypeCode = r.NationalTypeCode,
        CommercialName = r.CommercialName,
        TypeApprovalNumber = r.TypeApprovalNumber,
        EuCategory = r.EuCategory,
        NationalGenre = r.NationalGenre,
        EuBodyType = r.EuBodyType,
        NationalBodyType = r.NationalBodyType,
        TechnicallyPermissibleMaxMassKg = r.TechnicallyPermissibleMaxMassKg,
        MaxMassInServiceKg = r.MaxMassInServiceKg,
        MaxTrainMassKg = r.MaxTrainMassKg,
        MassInServiceKg = r.MassInServiceKg,
        NationalEmptyMassKg = r.NationalEmptyMassKg,
        EngineDisplacementCm3 = r.EngineDisplacementCm3,
        MaxNetPowerKw = r.MaxNetPowerKw,
        FuelCode = r.FuelCode,
        FiscalHorsepower = r.FiscalHorsepower,
        PowerToMassRatio = r.PowerToMassRatio,
        SeatingCapacity = r.SeatingCapacity,
        StandingCapacity = r.StandingCapacity,
        SoundLevelDb = r.SoundLevelDb,
        EngineSpeedRpm = r.EngineSpeedRpm,
        Co2GramsPerKm = r.Co2GramsPerKm,
        EmissionClass = r.EmissionClass,
        LastTechnicalInspectionAt = r.LastTechnicalInspectionAt,
        TechnicalInspectionValidUntil = r.TechnicalInspectionValidUntil,
        UpdatedAt = r.UpdatedAt
    };

    private static string SaleStatusLabel(string status) => status switch
    {
        nameof(VehicleSaleStatus.Draft) => "brouillon",
        nameof(VehicleSaleStatus.ForSale) => "en vente",
        nameof(VehicleSaleStatus.Reserved) => "réservé",
        nameof(VehicleSaleStatus.Sold) => "vendu",
        nameof(VehicleSaleStatus.Withdrawn) => "retiré de la vente",
        _ => status
    };

    private static string PostStatusLabel(string status) => status switch
    {
        nameof(SaleChannelPostStatus.Draft) => "à publier",
        nameof(SaleChannelPostStatus.Online) => "en ligne",
        nameof(SaleChannelPostStatus.Paused) => "en pause",
        nameof(SaleChannelPostStatus.Expired) => "expirée",
        nameof(SaleChannelPostStatus.Removed) => "retirée",
        _ => status
    };

    private static bool Contains(string? haystack, string needle)
        => haystack is not null && haystack.Contains(needle, StringComparison.OrdinalIgnoreCase);

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? NormalizeUpper(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();

    private static DateTime ToUtc(DateTime value)
        => value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);

    private static DateTime? ToUtcOrNull(DateTime? value)
        => value.HasValue ? ToUtc(value.Value) : null;
}
