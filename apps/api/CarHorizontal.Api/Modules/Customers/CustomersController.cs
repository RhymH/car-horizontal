using CarHorizontal.Api.Modules.Customers.Dtos;
using CarHorizontal.Api.Modules.Customers.Validators;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Customers;

[ApiController]
[Authorize]
[Route("api/customers")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customers;
    private readonly IValidator<CreateCustomerRequestDto> _createValidator;
    private readonly IValidator<UpdateCustomerRequestDto> _updateValidator;
    private readonly IValidator<AddInteractionRequestDto> _interactionValidator;

    public CustomersController(
        ICustomerService customers,
        IValidator<CreateCustomerRequestDto> createValidator,
        IValidator<UpdateCustomerRequestDto> updateValidator,
        IValidator<AddInteractionRequestDto> interactionValidator)
    {
        _customers = customers;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _interactionValidator = interactionValidator;
    }

    [HttpGet]
    public async Task<ActionResult<CustomersListResponseDto>> List(
        [FromQuery] CustomersListRequestDto request,
        CancellationToken ct)
    {
        var result = await _customers.ListAsync(request, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CustomerDetailDto>> Get(Guid id, CancellationToken ct)
    {
        var result = await _customers.GetAsync(id, ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<CustomerDetailDto>> Create(
        [FromBody] CreateCustomerRequestDto request,
        CancellationToken ct)
    {
        await _createValidator.ValidateAndThrowAsync(request, ct);
        var result = await _customers.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<CustomerDetailDto>> Update(
        Guid id,
        [FromBody] UpdateCustomerRequestDto request,
        CancellationToken ct)
    {
        await _updateValidator.ValidateAndThrowAsync(request, ct);
        var result = await _customers.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _customers.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/interactions")]
    public async Task<ActionResult<CustomerInteractionDto>> AddInteraction(
        Guid id,
        [FromBody] AddInteractionRequestDto request,
        CancellationToken ct)
    {
        await _interactionValidator.ValidateAndThrowAsync(request, ct);
        var result = await _customers.AddInteractionAsync(id, request, ct);
        return Ok(result);
    }
}
