using LibraryManagementSystem.Server.Dtos.Books;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace LibraryManagementSystem.Server.Services.Exports
{
    public class PdfBookExporter : IBookExporter
    {
        static PdfBookExporter() => QuestPDF.Settings.License = LicenseType.Community;

        public ExportFormat Format => ExportFormat.Pdf;

        public string ContentType => "application/pdf";

        public string FileExtension => "pdf";

        public byte[] Export(IReadOnlyList<BookDto> books) =>
            Document.Create(document => document.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(30);
                page.DefaultTextStyle(style => style.FontSize(9));

                page.Header().Column(column =>
                {
                    column.Item().Text("Book catalogue").FontSize(18).SemiBold();
                    column.Item().Text($"{books.Count} book(s) · generated {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC")
                        .FontColor(Colors.Grey.Darken1);
                });

                page.Content().PaddingTop(15).Table(table =>
                {
                    // Wide columns for the free-text fields, narrow ones for the short values.
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(3);   // Title
                        columns.RelativeColumn(2);   // ISBN
                        columns.RelativeColumn(1.2f); // Edition
                        columns.RelativeColumn(0.9f); // Pages
                        columns.RelativeColumn(1.3f); // Status
                        columns.RelativeColumn(1.5f); // Genre
                        columns.RelativeColumn(2.5f); // Authors
                        columns.RelativeColumn(1.5f); // Languages
                        columns.RelativeColumn(3);   // Locations
                        columns.RelativeColumn(1.6f); // Date acquired
                    });

                    table.Header(header =>
                    {
                        foreach (var name in BookExportRow.Headers)
                        {
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text(name).SemiBold();
                        }
                    });

                    foreach (var book in books)
                    {
                        foreach (var value in BookExportRow.From(book))
                        {
                            table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(value);
                        }
                    }
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Page ");
                    text.CurrentPageNumber();
                    text.Span(" of ");
                    text.TotalPages();
                });
            })).GeneratePdf();
    }
}
