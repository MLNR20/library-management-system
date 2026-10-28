using LibraryManagementSystem.Server.Dtos.Languages;

namespace LibraryManagementSystem.Server.Services
{
    public interface ILanguageService
    {
        Task<IReadOnlyList<LanguageDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<LanguageDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        Task<LanguageDto> CreateAsync(LanguageRequest request, CancellationToken cancellationToken = default);

        // Returns null when the language does not exist.
        Task<LanguageDto?> UpdateAsync(Guid id, LanguageRequest request, CancellationToken cancellationToken = default);

        // Returns false when the language does not exist.
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
