using LibraryManagementSystem.Server.Dtos.Rows;

namespace LibraryManagementSystem.Server.Services
{
    public interface IRowService
    {
        Task<IReadOnlyList<RowDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<RowDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        // Throws KeyNotFoundException when the shelf does not exist.
        Task<RowDto> CreateAsync(RowRequest request, CancellationToken cancellationToken = default);

        // Returns null when the row does not exist; throws KeyNotFoundException like CreateAsync.
        Task<RowDto?> UpdateAsync(Guid id, RowRequest request, CancellationToken cancellationToken = default);

        // Returns false when the row does not exist; throws InvalidOperationException while books are shelved in it.
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
