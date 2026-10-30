using LibraryManagementSystem.Server.Dtos.Books;

namespace LibraryManagementSystem.Server.Services.Exports
{
    // One implementation per file format; BookExporterFactory picks the right one.
    public interface IBookExporter
    {
        ExportFormat Format { get; }

        string ContentType { get; }

        string FileExtension { get; }

        byte[] Export(IReadOnlyList<BookDto> books);
    }
}
