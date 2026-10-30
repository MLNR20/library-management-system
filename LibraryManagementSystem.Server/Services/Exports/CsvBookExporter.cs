using System.Text;
using LibraryManagementSystem.Server.Dtos.Books;

namespace LibraryManagementSystem.Server.Services.Exports
{
    public class CsvBookExporter : IBookExporter
    {
        public ExportFormat Format => ExportFormat.Csv;

        public string ContentType => "text/csv";

        public string FileExtension => "csv";

        public byte[] Export(IReadOnlyList<BookDto> books)
        {
            var csv = new StringBuilder();
            AppendLine(csv, BookExportRow.Headers);
            foreach (var book in books)
            {
                AppendLine(csv, BookExportRow.From(book));
            }

            // The BOM makes Excel read the file as UTF-8 instead of the local code page.
            return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray();
        }

        private static void AppendLine(StringBuilder csv, IEnumerable<string> fields) =>
            csv.Append(string.Join(',', fields.Select(Escape))).Append("\r\n");

        private static string Escape(string field)
        {
            // Spreadsheets run cells starting with these characters as formulas, so neutralise them.
            if (field.Length > 0 && field[0] is '=' or '+' or '-' or '@' or '\t' or '\r')
            {
                field = "'" + field;
            }

            return field.IndexOfAny([',', '"', '\r', '\n']) >= 0
                ? $"\"{field.Replace("\"", "\"\"")}\""
                : field;
        }
    }
}
