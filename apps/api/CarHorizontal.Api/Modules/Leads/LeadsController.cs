using CarHorizontal.Api.Modules.Leads.Dtos;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Modules.Leads;

[ApiController]
[Authorize]
[Route("api/leads")]
public class LeadsController : ControllerBase
{
    private readonly ILeadsService _leads;
    private readonly IValidator<UpdateLeadRequestDto> _updateValidator;
    private readonly IValidator<CreateLeadFollowUpRequestDto> _followUpValidator;
    private readonly IValidator<MergeCustomersRequestDto> _mergeValidator;
    private readonly IValidator<LeadImportRequestDto> _importValidator;

    public LeadsController(
        ILeadsService leads,
        IValidator<UpdateLeadRequestDto> updateValidator,
        IValidator<CreateLeadFollowUpRequestDto> followUpValidator,
        IValidator<MergeCustomersRequestDto> mergeValidator,
        IValidator<LeadImportRequestDto> importValidator)
    {
        _leads = leads;
        _updateValidator = updateValidator;
        _followUpValidator = followUpValidator;
        _mergeValidator = mergeValidator;
        _importValidator = importValidator;
    }

    [HttpGet]
    public async Task<ActionResult<LeadsListResponseDto>> List(
        [FromQuery] LeadsListRequestDto request,
        CancellationToken ct)
    {
        return Ok(await _leads.ListAsync(request, ct));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<LeadStatsResponseDto>> Stats(
        [FromQuery] LeadStatsRequestDto request,
        CancellationToken ct)
    {
        return Ok(await _leads.GetStatsAsync(request, ct));
    }

    [HttpGet("team")]
    public async Task<ActionResult<List<LeadTeamMemberDto>>> Team(CancellationToken ct)
    {
        return Ok(await _leads.GetTeamAsync(ct));
    }

    [HttpGet("duplicates")]
    public async Task<ActionResult<LeadDuplicatesResponseDto>> Duplicates(CancellationToken ct)
    {
        return Ok(await _leads.FindDuplicatesAsync(ct));
    }

    [HttpPost("merge")]
    public async Task<ActionResult<MergeCustomersResponseDto>> Merge(
        [FromBody] MergeCustomersRequestDto request,
        CancellationToken ct)
    {
        await _mergeValidator.ValidateAndThrowAsync(request, ct);
        return Ok(await _leads.MergeAsync(request, ct));
    }

    [HttpPost("import")]
    public async Task<ActionResult<LeadImportResultDto>> Import(
        [FromBody] LeadImportRequestDto request,
        CancellationToken ct)
    {
        await _importValidator.ValidateAndThrowAsync(request, ct);
        return Ok(await _leads.ImportAsync(request, ct));
    }

    [HttpGet("{customerId:guid}")]
    public async Task<ActionResult<LeadDetailDto>> Get(Guid customerId, CancellationToken ct)
    {
        return Ok(await _leads.GetAsync(customerId, ct));
    }

    [HttpPut("{customerId:guid}")]
    public async Task<ActionResult<LeadDetailDto>> Update(
        Guid customerId,
        [FromBody] UpdateLeadRequestDto request,
        CancellationToken ct)
    {
        await _updateValidator.ValidateAndThrowAsync(request, ct);
        return Ok(await _leads.UpdateAsync(customerId, request, ct));
    }

    [HttpPost("{customerId:guid}/follow-ups")]
    public async Task<ActionResult<LeadFollowUpDto>> AddFollowUp(
        Guid customerId,
        [FromBody] CreateLeadFollowUpRequestDto request,
        CancellationToken ct)
    {
        await _followUpValidator.ValidateAndThrowAsync(request, ct);
        return Ok(await _leads.AddFollowUpAsync(customerId, request, ct));
    }

    [HttpPost("follow-ups/{id:guid}/complete")]
    public async Task<ActionResult<LeadFollowUpDto>> CompleteFollowUp(
        Guid id,
        [FromBody] CompleteLeadFollowUpRequestDto request,
        CancellationToken ct)
    {
        return Ok(await _leads.CompleteFollowUpAsync(id, request, ct));
    }

    [HttpPost("follow-ups/{id:guid}/cancel")]
    public async Task<ActionResult<LeadFollowUpDto>> CancelFollowUp(Guid id, CancellationToken ct)
    {
        return Ok(await _leads.CancelFollowUpAsync(id, ct));
    }
}
