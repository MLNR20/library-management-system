using LibraryManagementSystem.Server.Dtos.Books;

namespace LibraryManagementSystem.Server.Services
{
    public interface IBookService
    {
        Task<IReadOnlyList<BookDto>> GetAllAsync(CancellationToken cancellationToken = default);

        Task<BookDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        // Throws KeyNotFoundException when the genre or any author/language id does not exist.
        Task<BookDto> CreateAsync(BookRequest request, CancellationToken cancellationToken = default);

        // Returns null when the book does not exist; throws KeyNotFoundException like CreateAsync.
        Task<BookDto?> UpdateAsync(Guid id, BookRequest request, CancellationToken cancellationToken = default);

        // Returns false when the book does not exist.
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
