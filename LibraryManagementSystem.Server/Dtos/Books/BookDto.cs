using LibraryManagementSystem.Server.Dtos.Authors;
using LibraryManagementSystem.Server.Dtos.Languages;
using LibraryManagementSystem.Server.Dtos.Rows;
using LibraryManagementSystem.Server.Models;

namespace LibraryManagementSystem.Server.Dtos.Books
{
    public record BookDto(
        Guid Id,
        string Title,
        string Isbn,
        string? Edition,
        int Pages,
        BookStatus Status,
        DateOnly DateAcquired,
        Guid GenreId,
        string GenreName,
        IReadOnlyList<AuthorDto> Authors,
        IReadOnlyList<LanguageDto> Languages,
        IReadOnlyList<RowDto> Rows);
}
