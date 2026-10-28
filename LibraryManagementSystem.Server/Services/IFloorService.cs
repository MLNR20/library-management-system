using LibraryManagementSystem.Server.Dtos.Floors;

namespace LibraryManagementSystem.Server.Services
{
    public interface IFloorService
    {
        Task<IReadOnlyList<FloorDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<FloorDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        Task<FloorDto> CreateAsync(FloorRequest request, CancellationToken cancellationToken = default);

        // Returns null when the floor does not exist.
        Task<FloorDto?> UpdateAsync(Guid id, FloorRequest request, CancellationToken cancellationToken = default);

        // Returns false when the floor does not exist; throws InvalidOperationException while shelves or sections use it.
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
