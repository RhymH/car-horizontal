using CarHorizontal.Api.Modules.Vehicles.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Vehicles.Validators;

public class UpdateMileageRequestValidator : AbstractValidator<UpdateMileageRequestDto>
{
    public UpdateMileageRequestValidator()
    {
        RuleFor(x => x.Mileage).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Note).MaximumLength(500);
    }
}
