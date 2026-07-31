using CarHorizontal.Api.Modules.Capabilities;
using CarHorizontal.Api.Modules.Sales.Dtos;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DomainCapabilities = CarHorizontal.Domain.Capabilities.Capabilities;

namespace CarHorizontal.Api.Modules.Sales;

/// <summary>
/// Dossier de vente d'un véhicule. Les routes sont montées sous
/// <c>/api/vehicles/{vehicleId}/…</c> quand elles portent sur le dossier d'un
/// véhicule, et sous <c>/api/sales/…</c> pour les objets déjà identifiés (photo,
/// annonce, contact). L'ensemble est gaté par la capability « sales » : sans le
/// module, toutes les routes renvoient 403.
/// </summary>
[ApiController]
[Authorize]
[RequireCapability(DomainCapabilities.Sales)]
[Route("api")]
public class SalesController : ControllerBase
{
    /// <summary>Poids maximal accepté par photo, avant recompression serveur.</summary>
    private const long MaxPhotoBytes = 20 * 1024 * 1024;

    private const int MaxPhotosPerUpload = 30;

    private static readonly string[] AcceptedImageTypes =
        ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif", "image/bmp"];

    private readonly ISaleService _sales;
    private readonly IValidator<UpsertSaleListingRequestDto> _listingValidator;
    private readonly IValidator<ChangeSalePriceRequestDto> _priceValidator;
    private readonly IValidator<UpsertChannelPostRequestDto> _postValidator;
    private readonly IValidator<UpsertInquiryRequestDto> _inquiryValidator;
    private readonly IValidator<BuildMosaicRequestDto> _mosaicValidator;
    private readonly IValidator<UpsertRegistrationRequestDto> _registrationValidator;

    public SalesController(
        ISaleService sales,
        IValidator<UpsertSaleListingRequestDto> listingValidator,
        IValidator<ChangeSalePriceRequestDto> priceValidator,
        IValidator<UpsertChannelPostRequestDto> postValidator,
        IValidator<UpsertInquiryRequestDto> inquiryValidator,
        IValidator<BuildMosaicRequestDto> mosaicValidator,
        IValidator<UpsertRegistrationRequestDto> registrationValidator)
    {
        _sales = sales;
        _listingValidator = listingValidator;
        _priceValidator = priceValidator;
        _postValidator = postValidator;
        _inquiryValidator = inquiryValidator;
        _mosaicValidator = mosaicValidator;
        _registrationValidator = registrationValidator;
    }

    // --- Stock ----------------------------------------------------------

    /// <summary>Liste des dossiers de vente (vue stock).</summary>
    [HttpGet("sales/listings")]
    public async Task<ActionResult<SaleListingsListResponseDto>> ListListings(
        [FromQuery] SaleListingsListRequestDto request,
        CancellationToken ct)
        => Ok(await _sales.ListAsync(request, ct));

    // --- Dossier --------------------------------------------------------

    /// <summary>Dossier complet d'un véhicule. <c>listing</c> est null s'il n'a jamais été mis en vente.</summary>
    [HttpGet("vehicles/{vehicleId:guid}/sale")]
    public async Task<ActionResult<SaleDossierDto>> GetDossier(Guid vehicleId, CancellationToken ct)
        => Ok(await _sales.GetDossierAsync(vehicleId, ct));

    /// <summary>Ouvre le dossier au premier appel, le met à jour ensuite.</summary>
    [HttpPut("vehicles/{vehicleId:guid}/sale")]
    public async Task<ActionResult<SaleDossierDto>> UpsertListing(
        Guid vehicleId,
        [FromBody] UpsertSaleListingRequestDto request,
        CancellationToken ct)
    {
        await _listingValidator.ValidateAndThrowAsync(request, ct);
        return Ok(await _sales.UpsertListingAsync(vehicleId, request, ct));
    }

    [HttpDelete("vehicles/{vehicleId:guid}/sale")]
    public async Task<IActionResult> DeleteListing(Guid vehicleId, CancellationToken ct)
    {
        await _sales.DeleteListingAsync(vehicleId, ct);
        return NoContent();
    }

    /// <summary>Change le prix affiché ; l'historique est écrit automatiquement.</summary>
    [HttpPost("vehicles/{vehicleId:guid}/sale/price")]
    public async Task<ActionResult<SaleDossierDto>> ChangePrice(
        Guid vehicleId,
        [FromBody] ChangeSalePriceRequestDto request,
        CancellationToken ct)
    {
        await _priceValidator.ValidateAndThrowAsync(request, ct);
        return Ok(await _sales.ChangePriceAsync(vehicleId, request, ct));
    }

    /// <summary>
    /// Récapitulatif texte du dossier (immatriculation, prix, annonces).
    /// <c>includeInternal=true</c> ajoute les montants confidentiels — à ne pas
    /// utiliser pour un export destiné à l'acheteur.
    /// </summary>
    [HttpGet("vehicles/{vehicleId:guid}/sale/export")]
    public async Task<ActionResult> Export(
        Guid vehicleId,
        [FromQuery] bool includeInternal,
        CancellationToken ct)
    {
        var export = await _sales.ExportAsync(vehicleId, includeInternal, ct);
        return Ok(new { fileName = export.FileName, text = export.Text });
    }

    // --- Annonces publiées ----------------------------------------------

    [HttpPost("vehicles/{vehicleId:guid}/sale/channel-posts")]
    public async Task<ActionResult<SaleDossierDto>> AddChannelPost(
        Guid vehicleId,
        [FromBody] UpsertChannelPostRequestDto request,
        CancellationToken ct)
    {
        await _postValidator.ValidateAndThrowAsync(request, ct);
        return Ok(await _sales.AddChannelPostAsync(vehicleId, request, ct));
    }

    [HttpPatch("sales/channel-posts/{postId:guid}")]
    public async Task<ActionResult<SaleDossierDto>> UpdateChannelPost(
        Guid postId,
        [FromBody] UpsertChannelPostRequestDto request,
        CancellationToken ct)
    {
        await _postValidator.ValidateAndThrowAsync(request, ct);
        return Ok(await _sales.UpdateChannelPostAsync(postId, request, ct));
    }

    [HttpDelete("sales/channel-posts/{postId:guid}")]
    public async Task<ActionResult<SaleDossierDto>> DeleteChannelPost(Guid postId, CancellationToken ct)
        => Ok(await _sales.DeleteChannelPostAsync(postId, ct));

    // --- Photos ---------------------------------------------------------

    /// <summary>
    /// Ajoute une ou plusieurs photos. Chaque image est recompressée en JPEG côté
    /// serveur (plein format + vignette) avant stockage : le client peut envoyer les
    /// photos brutes du téléphone.
    /// </summary>
    [HttpPost("vehicles/{vehicleId:guid}/sale/photos")]
    [RequestSizeLimit(MaxPhotoBytes * MaxPhotosPerUpload)]
    public async Task<ActionResult<SaleDossierDto>> AddPhotos(
        Guid vehicleId,
        [FromForm] IFormFileCollection files,
        CancellationToken ct)
    {
        if (files.Count == 0) return BadRequest(Problem("Aucun fichier reçu.", "Import de photos"));
        if (files.Count > MaxPhotosPerUpload)
            return BadRequest(Problem($"{MaxPhotosPerUpload} photos maximum par envoi.", "Import de photos"));

        var uploads = new List<PhotoUpload>(files.Count);
        foreach (var file in files)
        {
            if (file.Length == 0) continue;
            if (file.Length > MaxPhotoBytes)
                return BadRequest(Problem($"« {file.FileName} » dépasse 20 Mo.", "Import de photos"));

            var contentType = (file.ContentType ?? "").ToLowerInvariant();
            if (!AcceptedImageTypes.Contains(contentType))
                return BadRequest(Problem($"« {file.FileName} » n'est pas une image prise en charge.", "Import de photos"));

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream, ct);
            uploads.Add(new PhotoUpload(file.FileName, contentType, stream.ToArray()));
        }

        if (uploads.Count == 0) return BadRequest(Problem("Aucun fichier exploitable.", "Import de photos"));

        return Ok(await _sales.AddPhotosAsync(vehicleId, uploads, ct));
    }

    [HttpPatch("sales/photos/{photoId:guid}")]
    public async Task<ActionResult<SaleDossierDto>> UpdatePhoto(
        Guid photoId,
        [FromBody] UpdateSalePhotoRequestDto request,
        CancellationToken ct)
        => Ok(await _sales.UpdatePhotoAsync(photoId, request, ct));

    [HttpPost("vehicles/{vehicleId:guid}/sale/photos/reorder")]
    public async Task<ActionResult<SaleDossierDto>> ReorderPhotos(
        Guid vehicleId,
        [FromBody] ReorderSalePhotosRequestDto request,
        CancellationToken ct)
        => Ok(await _sales.ReorderPhotosAsync(vehicleId, request, ct));

    [HttpDelete("sales/photos/{photoId:guid}")]
    public async Task<ActionResult<SaleDossierDto>> DeletePhoto(Guid photoId, CancellationToken ct)
        => Ok(await _sales.DeletePhotoAsync(photoId, ct));

    /// <summary>Binaire d'une photo. <c>thumbnail=true</c> renvoie la vignette de galerie.</summary>
    [HttpGet("sales/photos/{photoId:guid}/content")]
    public async Task<IActionResult> GetPhotoContent(
        Guid photoId,
        [FromQuery] bool thumbnail,
        CancellationToken ct)
    {
        var content = await _sales.GetPhotoContentAsync(photoId, thumbnail, ct);
        if (content is null) return NotFound();

        // Le contenu d'une photo ne change jamais (un nouvel upload crée un nouvel
        // identifiant) : le navigateur peut le garder longtemps.
        Response.Headers.CacheControl = "private, max-age=31536000, immutable";
        return File(content.Content, content.ContentType);
    }

    /// <summary>
    /// Compose plusieurs photos en une seule image JPEG téléchargeable — permet de
    /// publier une annonce riche là où le site limite le nombre de visuels.
    /// </summary>
    [HttpPost("vehicles/{vehicleId:guid}/sale/mosaic")]
    public async Task<IActionResult> BuildMosaic(
        Guid vehicleId,
        [FromBody] BuildMosaicRequestDto request,
        CancellationToken ct)
    {
        await _mosaicValidator.ValidateAndThrowAsync(request, ct);
        var image = await _sales.BuildMosaicAsync(vehicleId, request, ct);
        return File(image.Content, image.ContentType, $"mosaique-{vehicleId.ToString()[..8]}.jpg");
    }

    // --- Prospection ----------------------------------------------------

    [HttpPost("vehicles/{vehicleId:guid}/sale/inquiries")]
    public async Task<ActionResult<SaleDossierDto>> AddInquiry(
        Guid vehicleId,
        [FromBody] UpsertInquiryRequestDto request,
        CancellationToken ct)
    {
        await _inquiryValidator.ValidateAndThrowAsync(request, ct);

        // À la création il n'y a pas de rattachement préexistant à conserver : sans
        // client, le contact serait orphelin. La règle ne vaut qu'ici, pas en
        // édition, d'où le contrôle dans l'action plutôt que dans le validateur.
        if (request.CustomerId is null && request.NewBuyer is null)
        {
            return BadRequest(Problem(
                "Sélectionnez un client existant ou renseignez le nouvel acheteur.",
                "Contact acheteur"));
        }

        return Ok(await _sales.AddInquiryAsync(vehicleId, request, ct));
    }

    [HttpPatch("sales/inquiries/{inquiryId:guid}")]
    public async Task<ActionResult<SaleDossierDto>> UpdateInquiry(
        Guid inquiryId,
        [FromBody] UpsertInquiryRequestDto request,
        CancellationToken ct)
    {
        await _inquiryValidator.ValidateAndThrowAsync(request, ct);
        return Ok(await _sales.UpdateInquiryAsync(inquiryId, request, ct));
    }

    [HttpDelete("sales/inquiries/{inquiryId:guid}")]
    public async Task<ActionResult<SaleDossierDto>> DeleteInquiry(Guid inquiryId, CancellationToken ct)
        => Ok(await _sales.DeleteInquiryAsync(inquiryId, ct));

    /// <summary>
    /// Contacts acheteurs rattachés à un client — alimente la fiche client et la
    /// fiche prospect, pour qu'un acheteur ne soit pas visible seulement depuis le
    /// véhicule.
    /// </summary>
    [HttpGet("customers/{customerId:guid}/sale-inquiries")]
    public async Task<ActionResult<CustomerSaleInquiriesResponseDto>> ListCustomerInquiries(
        Guid customerId,
        CancellationToken ct)
        => Ok(await _sales.ListCustomerInquiriesAsync(customerId, ct));

    // --- Carte grise ----------------------------------------------------

    /// <summary>Enregistre les données du certificat d'immatriculation du véhicule.</summary>
    [HttpPut("vehicles/{vehicleId:guid}/registration")]
    public async Task<ActionResult<SaleDossierDto>> UpsertRegistration(
        Guid vehicleId,
        [FromBody] UpsertRegistrationRequestDto request,
        CancellationToken ct)
    {
        await _registrationValidator.ValidateAndThrowAsync(request, ct);
        return Ok(await _sales.UpsertRegistrationAsync(vehicleId, request, ct));
    }

    private ProblemDetails Problem(string detail, string title) => new()
    {
        Status = StatusCodes.Status400BadRequest,
        Title = title,
        Detail = detail
    };
}
