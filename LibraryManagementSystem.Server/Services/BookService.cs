using LibraryManagementSystem.Server.Dtos.Books;
using LibraryManagementSystem.Server.Mapping;
using LibraryManagementSystem.Server.Models;
using LibraryManagementSystem.Server.Repositories;
using Microsoft.EntityFrameworkCore;

namespace LibraryManagementSystem.Server.Services
{
    public class BookService(IUnitOfWork unitOfWork) : IBookService
    {
        public async Task<IReadOnlyList<BookDto>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var books = await WithRelations(unitOfWork.Books.Query())
                .OrderBy(b => b.Title)
                .ToListAsync(cancellationToken);

            return books.Select(BookMapper.ToDto).ToList();
        }

        public async Task<BookDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var book = await WithRelations(unitOfWork.Books.Query()).FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

            return book is null ? null : BookMapper.ToDto(book);
        }

        public async Task<BookDto> CreateAsync(BookRequest request, CancellationToken cancellationToken = default)
        {
            var book = BookMapper.ToEntity(request);
            await ResolveRelationsAsync(book, request, cancellationToken);

            await unitOfWork.Books.AddAsync(book, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return BookMapper.ToDto(book);
        }

        public async Task<BookDto?> UpdateAsync(Guid id, BookRequest request, CancellationToken cancellationToken = default)
        {
            // Tracked, so the changes below are picked up by SaveChangesAsync without calling Update.
            var book = await WithRelations(unitOfWork.Books.Query(asNoTracking: false))
                .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
            if (book is null)
            {
                return null;
            }

            BookMapper.Apply(request, book);
            await ResolveRelationsAsync(book, request, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return BookMapper.ToDto(book);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var book = await unitOfWork.Books.GetByIdAsync(id, cancellationToken);
            if (book is null)
            {
                return false;
            }

            // The AuthorBook / BookLanguage join rows are removed by the database cascade.
            unitOfWork.Books.Remove(book);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return true;
        }

        private static IQueryable<Book> WithRelations(IQueryable<Book> books) =>
            books.Include(b => b.Genre)
                .Include(b => b.Authors)
                .Include(b => b.Languages)
                .Include(b => b.Rows).ThenInclude(r => r.Shelf).ThenInclude(s => s.Floor);

        // Replaces the genre, authors and languages on the book with the entities named in the request.
        private async Task ResolveRelationsAsync(Book book, BookRequest request, CancellationToken cancellationToken)
        {
            book.Genre = await unitOfWork.Genres.GetByIdAsync(request.GenreId, cancellationToken)
                ?? throw new KeyNotFoundException($"Genre {request.GenreId} was not found.");

            var authorIds = request.AuthorIds.Distinct().ToList();
            var authors = await unitOfWork.Authors.Query(asNoTracking: false)
                .Where(a => authorIds.Contains(a.Id))
                .ToListAsync(cancellationToken);
            EnsureAllFound("Author", authorIds, authors.Select(a => a.Id));

            var languageIds = request.LanguageIds.Distinct().ToList();
            var languages = await unitOfWork.Languages.Query(asNoTracking: false)
                .Where(l => languageIds.Contains(l.Id))
                .ToListAsync(cancellationToken);
            EnsureAllFound("Language", languageIds, languages.Select(l => l.Id));

            var rowIds = request.RowIds.Distinct().ToList();
            // Shelf and Floor are loaded so the returned DTO can show the full location.
            var rows = await unitOfWork.Rows.Query(asNoTracking: false)
                .Include(r => r.Shelf).ThenInclude(s => s.Floor)
                .Where(r => rowIds.Contains(r.Id))
                .ToListAsync(cancellationToken);
            EnsureAllFound("Row", rowIds, rows.Select(r => r.Id));

            book.Rows.Clear();
            foreach (var row in rows)
            {
                book.Rows.Add(row);
            }

            book.Authors.Clear();
            foreach (var author in authors)
            {
                book.Authors.Add(author);
            }

            book.Languages.Clear();
            foreach (var language in languages)
            {
                book.Languages.Add(language);
            }
        }

        private static void EnsureAllFound(string name, IEnumerable<Guid> requested, IEnumerable<Guid> found)
        {
            var missing = requested.Except(found).ToList();
            if (missing.Count > 0)
            {
                throw new KeyNotFoundException($"{name} not found: {string.Join(", ", missing)}.");
            }
        }
    }
}
