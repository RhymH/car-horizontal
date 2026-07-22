using CarHorizontal.Api.Modules.Vehicles.Dtos;
using FluentValidation;

namespace CarHorizontal.Api.Modules.Vehicles.Validators;

public class AddVehicleNoteRequestValidator : AbstractValidator<AddVehicleNoteRequestDto>
{
    public AddVehicleNoteRequestValidator()
    {
        RuleFor(x => x.Body).NotEmpty().MaximumLength(2000);
    }
}
