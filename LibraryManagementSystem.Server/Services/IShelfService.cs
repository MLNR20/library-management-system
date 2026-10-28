using LibraryManagementSystem.Server.Dtos.Shelves;

namespace LibraryManagementSystem.Server.Services
{
    public interface IShelfService
    {
        Task<IReadOnlyList<ShelfDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<ShelfDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        // Throws KeyNotFoundException when the floor does not exist.
        Task<ShelfDto> CreateAsync(ShelfRequest request, CancellationToken cancellationToken = default);

        // Returns null when the shelf does not exist; throws KeyNotFoundException like CreateAsync, and
        // InvalidOperationException when moving the shelf to another floor while sections use it.
        Task<ShelfDto?> UpdateAsync(Guid id, ShelfRequest request, CancellationToken cancellationToken = default);

        // Returns false when the shelf does not exist; throws InvalidOperationException while rows or sections use it.
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
