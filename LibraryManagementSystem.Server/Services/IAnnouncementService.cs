using LibraryManagementSystem.Server.Dtos.Announcements;

namespace LibraryManagementSystem.Server.Services
{
    public interface IAnnouncementService
    {
        // Newest first.
        Task<IReadOnlyList<AnnouncementDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<AnnouncementDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        // Throws KeyNotFoundException when a floor is given and does not exist.
        Task<AnnouncementDto> CreateAsync(AnnouncementRequest request, CancellationToken cancellationToken = default);

        // Returns null when the announcement does not exist; throws KeyNotFoundException like CreateAsync.
        Task<AnnouncementDto?> UpdateAsync(Guid id, AnnouncementRequest request, CancellationToken cancellationToken = default);

        // Returns false when the announcement does not exist.
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
