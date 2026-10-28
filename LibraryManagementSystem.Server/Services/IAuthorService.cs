using LibraryManagementSystem.Server.Dtos.Authors;

namespace LibraryManagementSystem.Server.Services
{
    public interface IAuthorService
    {
        Task<IReadOnlyList<AuthorDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<AuthorDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        Task<AuthorDto> CreateAsync(AuthorRequest request, CancellationToken cancellationToken = default);

        // Returns null when the author does not exist.
        Task<AuthorDto?> UpdateAsync(Guid id, AuthorRequest request, CancellationToken cancellationToken = default);

        // Returns false when the author does not exist.
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
