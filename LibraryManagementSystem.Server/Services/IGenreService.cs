using LibraryManagementSystem.Server.Dtos.Genres;

namespace LibraryManagementSystem.Server.Services
{
    public interface IGenreService
    {
        Task<IReadOnlyList<GenreDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<GenreDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        Task<GenreDto> CreateAsync(GenreRequest request, CancellationToken cancellationToken = default);

        // Returns null when the genre does not exist.
        Task<GenreDto?> UpdateAsync(Guid id, GenreRequest request, CancellationToken cancellationToken = default);

        // Returns false when the genre does not exist; throws InvalidOperationException while books still use it.
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
