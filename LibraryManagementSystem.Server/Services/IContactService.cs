using LibraryManagementSystem.Server.Dtos.Contacts;

namespace LibraryManagementSystem.Server.Services
{
    public interface IContactService
    {
        Task<IReadOnlyList<ContactDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<ContactDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        Task<ContactDto> CreateAsync(ContactRequest request, CancellationToken cancellationToken = default);

        // Returns null when the contact does not exist.
        Task<ContactDto?> UpdateAsync(Guid id, ContactRequest request, CancellationToken cancellationToken = default);

        // Returns false when the contact does not exist.
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
