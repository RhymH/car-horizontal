using CarHorizontal.Api.Modules.Vehicles.Dtos;
using CarHorizontal.Domain.Vehicles;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Vehicles;

[ApiController]
[Authorize]
[Route("api/vehicles")]
public class VehiclesController : ControllerBase
{
    private readonly IVehicleService _vehicles;
    private readonly IVinDecoder _vinDecoder;
    private readonly IValidator<CreateVehicleRequestDto> _createValidator;
    private readonly IValidator<UpdateVehicleRequestDto> _updateValidator;
    private readonly IValidator<UpdateMileageRequestDto> _mileageValidator;
    private readonly IValidator<AddVehicleNoteRequestDto> _noteValidator;

    public VehiclesController(
        IVehicleService vehicles,
        IVinDecoder vinDecoder,
        IValidator<CreateVehicleRequestDto> createValidator,
        IValidator<UpdateVehicleRequestDto> updateValidator,
        IValidator<UpdateMileageRequestDto> mileageValidator,
        IValidator<AddVehicleNoteRequestDto> noteValidator)
    {
        _vehicles = vehicles;
        _vinDecoder = vinDecoder;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _mileageValidator = mileageValidator;
        _noteValidator = noteValidator;
    }

    /// <summary>
    /// Decodes a VIN to help pre-fill a vehicle form. The configured provider
    /// enriches make/model/year/fuel/engine/transmission (NHTSA), degrading to a
    /// local structural decode when offline. Returns IsValid=false with a reason
    /// when the VIN is malformed.
    /// </summary>
    [HttpPost("decode-vin")]
    public async Task<ActionResult<VinDecodeResponseDto>> DecodeVin(
        [FromBody] DecodeVinRequestDto request,
        CancellationToken ct)
    {
        var r = await _vinDecoder.DecodeAsync(request.Vin, ct);
        return Ok(new VinDecodeResponseDto
        {
            Vin = r.Vin,
            IsValid = r.IsValid,
            Make = r.Make,
            Country = r.Country,
            ModelYear = r.ModelYear,
            Wmi = r.Wmi,
            Model = r.Model,
            FuelType = r.FuelType,
            BodyClass = r.BodyClass,
            VehicleType = r.VehicleType,
            EngineDisplacementL = r.EngineDisplacementL,
            EngineCylinders = r.EngineCylinders,
            TransmissionStyle = r.TransmissionStyle,
            Manufacturer = r.Manufacturer,
            PlantCountry = r.PlantCountry,
            Series = r.Series,
            Trim = r.Trim,
            Source = r.Source,
            Error = r.Error
        });
    }

    [HttpGet]
    public async Task<ActionResult<VehiclesListResponseDto>> List(
        [FromQuery] VehiclesListRequestDto request,
        CancellationToken ct)
    {
        var result = await _vehicles.ListAsync(request, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<VehicleDetailDto>> Get(Guid id, CancellationToken ct)
    {
        var result = await _vehicles.GetAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<VehicleDetailDto>> Create(
        [FromBody] CreateVehicleRequestDto request,
        CancellationToken ct)
    {
        await _createValidator.ValidateAndThrowAsync(request, ct);
        var result = await _vehicles.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<VehicleDetailDto>> Update(
        Guid id,
        [FromBody] UpdateVehicleRequestDto request,
        CancellationToken ct)
    {
        await _updateValidator.ValidateAndThrowAsync(request, ct);
        var result = await _vehicles.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _vehicles.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/mileage")]
    public async Task<ActionResult<VehicleDetailDto>> UpdateMileage(
        Guid id,
        [FromBody] UpdateMileageRequestDto request,
        CancellationToken ct)
    {
        await _mileageValidator.ValidateAndThrowAsync(request, ct);
        var result = await _vehicles.UpdateMileageAsync(id, request, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/notes")]
    public async Task<ActionResult<VehicleDetailDto>> AddNote(
        Guid id,
        [FromBody] AddVehicleNoteRequestDto request,
        CancellationToken ct)
    {
        await _noteValidator.ValidateAndThrowAsync(request, ct);
        var result = await _vehicles.AddNoteAsync(id, request, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/photo")]
    public ActionResult UploadPhoto(Guid id, IFormFile? file, CancellationToken ct)
    {
        // Storage backend ships in Phase 14 (T140). Until then, expose the
        // route shape so the front-end can wire it up but return 501.
        return StatusCode(StatusCodes.Status501NotImplemented, new
        {
            message = "Photo storage backend is not yet available (planned in Phase 14)."
        });
    }

    [HttpGet("{id:guid}/program-projection")]
    public async Task<ActionResult<VehicleProgramProjectionDto>> GetProgramProjection(Guid id, CancellationToken ct)
    {
        var result = await _vehicles.GetProgramProjectionAsync(id, ct);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpGet("{id:guid}/mileage-estimate")]
    public async Task<ActionResult<MileageEstimateDto>> GetMileageEstimate(Guid id, CancellationToken ct)
    {
        var result = await _vehicles.GetMileageEstimateAsync(id, ct);
        return Ok(result);
    }
}
