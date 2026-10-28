using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Dtos.Books
{
    public record BookRequest(
        string Title,
        string Isbn,
        string? Edition,
        int Pages,
        BookStatus Status,
        DateOnly DateAcquired,
        Guid GenreId,
        IReadOnlyList<Guid> AuthorIds,
        IReadOnlyList<Guid> LanguageIds,
        IReadOnlyList<Guid> RowIds);
}
