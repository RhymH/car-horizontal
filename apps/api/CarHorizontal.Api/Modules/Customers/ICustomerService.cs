using CarHorizontal.Api.Modules.Customers.Dtos;

namespace CarHorizontal.Api.Modules.Customers;

public interface ICustomerService
{
    Task<CustomersListResponseDto> ListAsync(CustomersListRequestDto request, CancellationToken ct = default);
    Task<CustomerDetailDto> GetAsync(Guid id, CancellationToken ct = default);
    Task<CustomerDetailDto> CreateAsync(CreateCustomerRequestDto request, CancellationToken ct = default);
    Task<CustomerDetailDto> UpdateAsync(Guid id, UpdateCustomerRequestDto request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<CustomerInteractionDto> AddInteractionAsync(Guid customerId, AddInteractionRequestDto request, CancellationToken ct = default);
}
