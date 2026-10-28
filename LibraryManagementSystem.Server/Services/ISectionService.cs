using LibraryManagementSystem.Server.Dtos.Sections;

namespace LibraryManagementSystem.Server.Services
{
    public interface ISectionService
    {
        Task<IReadOnlyList<SectionDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<SectionDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        // Throws KeyNotFoundException when the floor or shelf does not exist, and ArgumentException
        // when the shelf is not on the given floor.
        Task<SectionDto> CreateAsync(SectionRequest request, CancellationToken cancellationToken = default);

        // Returns null when the section does not exist; throws like CreateAsync.
        Task<SectionDto?> UpdateAsync(Guid id, SectionRequest request, CancellationToken cancellationToken = default);

        // Returns false when the section does not exist.
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
