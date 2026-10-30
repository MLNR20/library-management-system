using LibraryManagementSystem.Server.Dtos.Books;

namespace LibraryManagementSystem.Server.Services.Exports
{
    // The flattened, display-ready columns shared by every exporter so the formats never drift apart.
    public static class BookExportRow
    {
        public static readonly IReadOnlyList<string> Headers =
            ["Title", "ISBN", "Edition", "Pages", "Status", "Genre", "Authors", "Languages", "Locations", "Date Acquired"];

        public static IReadOnlyList<string> From(BookDto book) =>
        [
            book.Title,
            book.Isbn,
            book.Edition ?? "",
            book.Pages.ToString(),
            book.Status.ToString(),
            book.GenreName,
            string.Join("; ", book.Authors.Select(a => a.Name)),
            string.Join("; ", book.Languages.Select(l => l.Name)),
            string.Join("; ", book.Rows.Select(r => $"{r.FloorName} / {r.ShelfName} / {r.Name}")),
            book.DateAcquired.ToString("yyyy-MM-dd")
        ];
    }
}
